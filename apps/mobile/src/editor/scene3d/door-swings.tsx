import { design, type Room } from "@buildit/core";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, type Mesh } from "three";
import { useFrame } from "./r3f";
import { facesCamera } from "./view";
import { color } from "@/theme";
import { doorSwings, swingArc, type Swing } from "../door-swing";

const LEAF_H = 2.08;
const LOW = 0.06; // when its wall is hidden (it faces the camera), the door lies low like the cut wall instead of standing mid-room

/** The floor a door sweeps, as a translucent fan; and the door itself, standing open (low when its wall is hidden). */
function DoorSwing({ swing, view }: { swing: Swing; view: RefObject<{ az: number }> }) {
  const leaf = useRef<Mesh>(null);
  useFrame(() => {
    const m = leaf.current;
    if (!m) return;
    const h = facesCamera({ x: -swing.into.x, z: -swing.into.z }, view.current.az) ? LOW : LEAF_H;
    m.scale.y = h / LEAF_H;
    m.position.y = h / 2;
  });
  const fan = useMemo(() => {
    const [h, ...arc] = [swing.hinge, ...swingArc(swing)];
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(arc.slice(0, -1).flatMap((p, i) => [h.x, 0, h.z, p.x, 0, p.z, arc[i + 1].x, 0, arc[i + 1].z]), 3));
    return g;
  }, [swing]);
  useEffect(() => () => fan.dispose(), [fan]);
  return (
    <>
      <mesh geometry={fan} position={[0, 0.006, 0]} renderOrder={1}><meshBasicMaterial color={color.accent} transparent opacity={0.14} depthWrite={false} side={DoubleSide} /></mesh>
      <group position={[swing.hinge.x, 0, swing.hinge.z]} rotation={[0, Math.atan2(swing.into.x, swing.into.z), 0]}>
        <mesh ref={leaf} position={[0, LEAF_H / 2, swing.radius / 2]} castShadow><boxGeometry args={[0.04, LEAF_H, swing.radius - 0.02]} /><meshStandardMaterial color={design.materials.furniture.linen} roughness={0.7} /></mesh>
      </group>
    </>
  );
}

export const DoorSwings = ({ room, view }: { room: Room; view: RefObject<{ az: number }> }) => <>{useMemo(() => doorSwings(room), [room]).map((s) => <DoorSwing key={s.openingId} swing={s} view={view} />)}</>;
