import { placeObject, snapToWalls, typeInfo, type ClearanceReport, type OpResult, type Scene } from "@buildit/core";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ACESFilmicToneMapping, PCFSoftShadowMap, Vector3 } from "three";
import { useToast } from "@/components/toast";
import { t } from "@/i18n";
import { color } from "@/theme";
import { draggedTo, floorPoint, pickPiece, type Drag } from "./interaction";
import { PerfProbe } from "./perf-probe";
import { useCanvasActive } from "./use-canvas-active";
import { DoorSwings } from "./door-swings";
import { Piece } from "./piece";
import { WalkFloor } from "./walk-floor";
import { RoomShell } from "./room-shell";
import { cameraOffset, clampElevation, clampZoom, fitView, START } from "./view";

interface View3D {
  az: number;
  el: number;
  zoom: number;
}

interface Props {
  scene: Scene;
  selectedId: string | null;
  topInset: number;
  bottomInset: number;
  /** Where it is walkable, when the walking-space overlay is on. */
  walk: ClearanceReport | null;
  onSelect: (id: string | null) => void;
  onPlace: (id: string, result: OpResult) => void;
}

/** Points on the room's box (floor corners and the top of the walls): what the camera has to fit. */
const roomPoints = (scene: Scene) => scene.room.corners.flatMap((c) => [new Vector3(c.x, 0, c.z), new Vector3(c.x, scene.room.height, c.z)]);
const centreOf = (scene: Scene) => {
  const n = scene.room.corners.length;
  return new Vector3(scene.room.corners.reduce((s, c) => s + c.x, 0) / n, 0, scene.room.corners.reduce((s, c) => s + c.z, 0) / n);
};

/** Places the orthographic camera from the view angles each frame, fitted to the room. Draws only when something asks for a frame. */
function Rig({ scene, view }: { scene: Scene; view: RefObject<View3D> }) {
  useFrame(({ camera, size }) => {
    const { az, el, zoom } = view.current;
    const fit = fitView(roomPoints(scene), az, el, size.width, size.height, 14);
    camera.position.copy(fit.target).add(cameraOffset(az, el, 30));
    camera.lookAt(fit.target);
    camera.zoom = fit.zoom * zoom;
    camera.updateProjectionMatrix();
  });
  return null;
}

/** Lets the gesture handlers (outside the canvas) reach the canvas's scene and camera. */
function Probe({ into }: { into: RefObject<RootState | null> }) {
  into.current = useThree();
  return null;
}

/** Two shadow-casting lights is one too many for the budget: a warm key light casts, the rest only fill. */
function Lights({ scene }: { scene: Scene }) {
  const c = centreOf(scene);
  return (
    <>
      <hemisphereLight args={[0xfff3e4, 0xd0c7b9, 0.75]} />
      <directionalLight position={[c.x + 3.5, 6.5, c.z + 2.6]} target-position={[c.x, 0, c.z]} intensity={2.1} color={0xffeedd} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-near={1} shadow-camera-far={20} />
      <directionalLight position={[c.x - 4, 5, c.z - 3]} intensity={0.3} color={0xdfe8ff} />
    </>
  );
}

/** Orbiting (a drag on bare floor) and pinch zoom: both only change the view angles and ask for a redraw. */
function useCameraGestures(view: RefObject<View3D>, redraw: () => void) {
  const start = useRef(1);
  const orbit = (dx: number, dy: number) => {
    view.current.az -= dx * 0.007;
    view.current.el = clampElevation(view.current.el + dy * 0.005);
    redraw();
  };
  const pinch = Gesture.Pinch().runOnJS(true).onStart(() => void (start.current = view.current.zoom)).onUpdate((e) => {
    view.current.zoom = clampZoom(start.current * e.scale);
    redraw();
  });
  return { orbit, pinch };
}

/** Picking up a piece, where it lands, and putting it down; the piece moves by changing its mesh, not React state. */
function useDragActions(scene: Scene, state: RefObject<RootState | null>, onPlace: Props["onPlace"]) {
  const redraw = () => state.current?.invalidate();
  const place = (id: string, x: number, z: number) => {
    state.current?.scene.getObjectByName(id)?.position.set(x, 0, z);
    redraw();
  };
  const grab = (x: number, y: number): Drag | null => {
    const piece = scene.objects.find((o) => o.id === (state.current && pickPiece(state.current, x, y)));
    const at = state.current && floorPoint(state.current, x, y);
    if (piece?.locked) useToast.getState().show(t("lockedNote"));
    return piece && at && !piece.locked ? { id: piece.id, grab: at, from: { x: piece.x, z: piece.z, rotation: piece.rotation } } : null;
  };
  const landing = (d: Drag, here: { x: number; z: number }) => {
    const piece = scene.objects.find((o) => o.id === d.id);
    const to = draggedTo(d, here);
    return piece ? snapToWalls(scene.room, piece, to) : to;
  };
  const end = (d: Drag, here: { x: number; z: number } | null) => {
    const to = here ? landing(d, here) : d.from;
    if (to.x !== d.from.x || to.z !== d.from.z) onPlace(d.id, placeObject(scene, d.id, to));
    const now = scene.objects.find((o) => o.id === d.id) ?? d.from;
    place(d.id, now.x, now.z); // a refused move goes back where it was
  };
  return { redraw, place, grab, landing, end };
}

/** Tap picks a piece, dragging a piece moves it on the floor in 5 cm steps, dragging bare floor orbits, pinching zooms. */
function useRoomGestures(scene: Scene, state: RefObject<RootState | null>, view: RefObject<View3D>, { onSelect, onPlace }: Pick<Props, "onSelect" | "onPlace">) {
  const drag = useRef<Drag | null>(null);
  const { redraw, place, grab, landing, end } = useDragActions(scene, state, onPlace);
  const camera = useCameraGestures(view, redraw);
  const tap = Gesture.Tap().runOnJS(true).onEnd((e) => state.current && onSelect(pickPiece(state.current, e.x, e.y)));
  const pan = Gesture.Pan().runOnJS(true).minDistance(6)
    .onStart((e) => {
      drag.current = grab(e.x - e.translationX, e.y - e.translationY);
      if (drag.current) onSelect(drag.current.id);
    })
    .onChange((e) => {
      const here = drag.current && state.current && floorPoint(state.current, e.x, e.y);
      if (drag.current && here) {
        const to = landing(drag.current, here);
        place(drag.current.id, to.x, to.z);
      }
      if (!drag.current) camera.orbit(e.changeX, e.changeY);
    })
    .onEnd((e) => {
      const d = drag.current;
      drag.current = null;
      if (d) end(d, state.current && floorPoint(state.current, e.x, e.y));
    });
  return Gesture.Simultaneous(camera.pinch, Gesture.Exclusive(pan, tap));
}

/** The room in 3D, between the header and the sheet. */
export function RoomCanvas({ scene, selectedId, topInset, bottomInset, walk, onSelect, onPlace }: Props) {
  const { height: screen } = useWindowDimensions();
  const height = Math.max(160, screen - topInset - bottomInset);
  const view = useRef<View3D>({ ...START });
  const state = useRef<RootState | null>(null);
  const gesture = useRoomGestures(scene, state, view, { onSelect, onPlace });
  const active = useCanvasActive();
  return (
    <GestureDetector gesture={gesture}>
      <View testID="room-canvas" style={[styles.canvas, { top: topInset, height }]}>
        <Canvas orthographic frameloop={active ? "demand" : "never"} dpr={[1, 2]} shadows={{ type: PCFSoftShadowMap }} gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.92 }} camera={{ near: -50, far: 100, zoom: 60 }}>
          <Probe into={state} />
          <PerfProbe />
          <Rig scene={scene} view={view} />
          <Lights scene={scene} />
          <RoomShell room={scene.room} view={view} />
          <DoorSwings room={scene.room} />
          {walk ? <WalkFloor report={walk} /> : null}
          <group name="pieces">
            {scene.objects.map((o) => <Piece key={o.id} piece={o} selected={o.id === selectedId} floorLevel={!!typeInfo(o.type).floorLevel} />)}
          </group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: { position: "absolute", start: 0, end: 0, backgroundColor: color.bg },
});
