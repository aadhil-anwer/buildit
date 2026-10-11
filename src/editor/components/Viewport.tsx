"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { DataTexture, LinearFilter, MOUSE, Plane, RGBAFormat, TOUCH, Vector3, type Group } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { obbCorners } from "@/core/geometry";
import type { ClearanceReport } from "@/core/layout/clearance";
import { roomBounds, roomCenter } from "@/core/room";
import { objectObb } from "@/core/scene";
import type { Scene, SceneObject } from "@/core/types";
import { useEditor } from "../store";
import { FurnitureModel } from "./FurnitureModel";
import { RoomMesh } from "./RoomMesh";

const toRad = (d: number) => (d * Math.PI) / 180;
const SNAP = 0.05;

/** Shortest-path angle interpolation in radians. */
function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function Footprint({ o, color, y = 0.02 }: { o: SceneObject; color: string; y?: number }) {
  const pts = useMemo(() => {
    const c = obbCorners(objectObb(o));
    return [...c, c[0]].map((p) => [p.x, y, p.z] as [number, number, number]);
  }, [o, y]);
  return <Line points={pts} color={color} lineWidth={2.5} />;
}

interface ItemProps {
  o: SceneObject;
  selected: boolean;
  problem: boolean;
  flashing: boolean;
  onDown: (e: ThreeEvent<PointerEvent>, o: SceneObject) => void;
}

function Item({ o, selected, problem, flashing, onDown }: ItemProps) {
  const ref = useRef<Group>(null);
  const first = useRef(true);
  const dragging = useEditor((s) => s.dragging);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const ry = toRad(o.rotation);
    if (first.current || (dragging && selected)) {
      g.position.set(o.x, 0, o.z);
      g.rotation.y = ry;
      first.current = false;
      return;
    }
    const t = 1 - Math.exp(-dt * 9);
    g.position.x += (o.x - g.position.x) * t;
    g.position.z += (o.z - g.position.z) * t;
    g.rotation.y = lerpAngle(g.rotation.y, ry, t);
  });

  return (
    <group>
      <group
        ref={ref}
        onPointerDown={(e) => onDown(e, o)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = o.locked ? "not-allowed" : "grab";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <FurnitureModel o={o} />
        {selected && (
          <Html position={[0, o.h + 0.25, 0]} center distanceFactor={8} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded-md bg-stone-900/85 px-2 py-1 text-[11px] font-medium text-white shadow">
              {o.name} · {Math.round(o.w * 100)}×{Math.round(o.d * 100)} cm{o.locked ? " · locked" : ""}
            </div>
          </Html>
        )}
      </group>
      {(selected || problem || flashing) && (
        <Footprint o={o} color={problem ? "#d64545" : selected ? "#2f6fdd" : "#e0a526"} />
      )}
    </group>
  );
}

function WalkwayOverlay({ report }: { report: ClearanceReport }) {
  const texture = useMemo(() => {
    const { cols, rows, overlay } = report;
    const data = new Uint8Array(cols * rows * 4);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = overlay[r * cols + c];
        const i = ((rows - 1 - r) * cols + c) * 4;
        if (v === 1) data.set([74, 170, 110, 105], i);
        else if (v === 2) data.set([222, 90, 70, 150], i);
      }
    }
    const t = new DataTexture(data, cols, rows, RGBAFormat);
    t.magFilter = LinearFilter;
    t.minFilter = LinearFilter;
    t.needsUpdate = true;
    return t;
  }, [report]);
  useEffect(() => () => texture.dispose(), [texture]);
  const w = report.cols * report.cell;
  const h = report.rows * report.cell;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[report.originX + w / 2, 0.018, report.originZ + h / 2]} renderOrder={2}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

/** Moves the camera when switching between 3D and top view or rooms. */
function CameraRig({ scene, controls }: { scene: Scene; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera, size } = useThree();
  const view = useEditor((s) => s.view);
  const sceneId = scene.id;
  const goal = useRef<{ pos: Vector3; target: Vector3 } | null>(null);
  const b = roomBounds(scene.room);
  const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
  const c = roomCenter(scene.room);
  // Narrow (portrait) viewports need the camera further back.
  const aspect = size.width / Math.max(1, size.height);
  const shape = Math.round(Math.max(1, 1.15 / aspect) * 10) / 10;

  useEffect(() => {
    const fit = span * shape;
    const target = new Vector3(c.x, 0, c.z);
    const pos =
      view === "top"
        ? new Vector3(c.x, fit * 1.4 + 1, c.z + 0.02)
        : new Vector3(c.x + fit * 0.3, fit * 1.0 + 1.4, c.z + fit * 1.25 + 1);
    goal.current = { pos, target };
    // Re-aim when the view, the room or the viewport shape changes, not on edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, sceneId, span, shape]);

  useFrame((_, dt) => {
    const g = goal.current;
    const ctl = controls.current;
    if (!g || !ctl) return;
    const t = 1 - Math.exp(-dt * 6);
    camera.position.lerp(g.pos, t);
    ctl.target.lerp(g.target, t);
    if (camera.position.distanceTo(g.pos) < 0.01) {
      // Land exactly, so the plan view is not left slightly rotated.
      camera.position.copy(g.pos);
      ctl.target.copy(g.target);
      goal.current = null;
    }
    ctl.update();
  });
  return null;
}

/** Drag furniture across the floor. */
function DragLayer({ scene }: { scene: Scene }) {
  const { camera, gl, raycaster, pointer } = useThree();
  const drag = useRef<{ id: string; offset: { x: number; z: number }; start: { x: number; z: number }; moved: boolean } | null>(null);
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);

  useEffect(() => {
    const el = gl.domElement;
    const hit = () => {
      raycaster.setFromCamera(pointer, camera);
      const p = new Vector3();
      return raycaster.ray.intersectPlane(plane, p) ? p : null;
    };
    const onMove = () => {
      const d = drag.current;
      if (!d) return;
      const p = hit();
      if (!p) return;
      const st = useEditor.getState();
      const b = roomBounds(st.scene.room);
      const x = Math.min(b.maxX, Math.max(b.minX, Math.round((p.x - d.offset.x) / SNAP) * SNAP));
      const z = Math.min(b.maxZ, Math.max(b.minZ, Math.round((p.z - d.offset.z) / SNAP) * SNAP));
      if (Math.abs(x - d.start.x) > 0.01 || Math.abs(z - d.start.z) > 0.01) d.moved = true;
      st.setLive({ ...st.scene, objects: st.scene.objects.map((o) => (o.id === d.id ? { ...o, x, z } : o)) });
    };
    const onUp = () => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      const st = useEditor.getState();
      st.setDragging(false);
      document.body.style.cursor = "";
      if (d.moved) {
        const o = st.scene.objects.find((x) => x.id === d.id);
        st.commit(st.scene, `Moved ${o?.name ?? d.id}`);
      }
    };
    el.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    const start = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      const o = useEditor.getState().scene.objects.find((x) => x.id === detail.id);
      const p = hit();
      if (!o || !p) return;
      drag.current = { id: o.id, offset: { x: p.x - o.x, z: p.z - o.z }, start: { x: o.x, z: o.z }, moved: false };
      useEditor.getState().setDragging(true);
      document.body.style.cursor = "grabbing";
    };
    el.addEventListener("buildit:dragstart", start);
    return () => {
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("buildit:dragstart", start);
    };
  }, [camera, gl, raycaster, pointer, plane, scene.id]);
  return null;
}

function Contents({ report, problemIds }: { report: ClearanceReport | null; problemIds: Set<string> }) {
  const scene = useEditor((s) => s.scene);
  const selectedId = useEditor((s) => s.selectedId);
  const flash = useEditor((s) => s.flash);
  const showWalkways = useEditor((s) => s.showWalkways);
  const aiBusy = useEditor((s) => s.aiBusy);
  const dragging = useEditor((s) => s.dragging);
  const view = useEditor((s) => s.view);
  const controls = useRef<OrbitControlsImpl>(null);
  const { gl } = useThree();
  const flashing = new Set(flash.ids);

  const onDown = (e: ThreeEvent<PointerEvent>, o: SceneObject) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const st = useEditor.getState();
    st.select(o.id);
    if (o.locked || aiBusy) return;
    // Stop the camera from orbiting on this same press.
    if (controls.current) controls.current.enabled = false;
    gl.domElement.dispatchEvent(new CustomEvent("buildit:dragstart", { detail: { id: o.id } }));
  };

  const c = roomCenter(scene.room);
  // Draw rugs first so their outlines sit under furniture.
  const ordered = useMemo(() => [...scene.objects].sort((a, b) => Number(b.type === "rug") - Number(a.type === "rug")), [scene.objects]);

  return (
    <>
      <color attach="background" args={["#efebe4"]} />
      <hemisphereLight args={["#ffffff", "#c9bba5", 0.85]} />
      <directionalLight
        position={[c.x + 4, 9, c.z + 6]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
      />
      <ambientLight intensity={0.25} />
      <RoomMesh room={scene.room} onFloorClick={() => useEditor.getState().select(null)} />
      {ordered.map((o) => (
        <Item key={o.id} o={o} selected={o.id === selectedId} problem={problemIds.has(o.id)} flashing={flashing.has(o.id)} onDown={onDown} />
      ))}
      {showWalkways && report && <WalkwayOverlay report={report} />}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!dragging}
        enableRotate={view === "3d"}
        mouseButtons={{ LEFT: view === "top" ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
        touches={{ ONE: view === "top" ? TOUCH.PAN : TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
        maxPolarAngle={view === "3d" ? Math.PI * 0.47 : Math.PI * 0.2}
        minDistance={2}
        maxDistance={30}
        enableDamping
      />
      <CameraRig scene={scene} controls={controls} />
      <DragLayer scene={scene} />
    </>
  );
}

export function Viewport({ report, problemIds }: { report: ClearanceReport | null; problemIds: Set<string> }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 42, near: 0.1, far: 200, position: [6, 7, 11] }}
      gl={{ preserveDrawingBuffer: true }}
      onPointerMissed={(e) => {
        if (e.button === 0) useEditor.getState().select(null);
      }}
    >
      <Contents report={report} problemIds={problemIds} />
    </Canvas>
  );
}
