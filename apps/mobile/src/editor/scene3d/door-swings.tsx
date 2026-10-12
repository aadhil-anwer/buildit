import { design, type Room } from "@buildit/core";
import { useEffect, useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from "three";
import { color } from "@/theme";
import { doorSwings, swingArc, type Swing } from "../door-swing";

/** The floor a door sweeps, as a translucent fan; and the door itself, standing open. */
function DoorSwing({ swing }: { swing: Swing }) {
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
        <mesh position={[0, 1.04, swing.radius / 2]} castShadow><boxGeometry args={[0.04, 2.08, swing.radius - 0.02]} /><meshStandardMaterial color={design.materials.furniture.linen} roughness={0.7} /></mesh>
      </group>
    </>
  );
}

export const DoorSwings = ({ room }: { room: Room }) => <>{useMemo(() => doorSwings(room), [room]).map((s) => <DoorSwing key={s.openingId} swing={s} />)}</>;
