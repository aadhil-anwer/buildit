import { getWalls, type Room } from "@buildit/core";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import { DoubleSide, ExtrudeGeometry, Group, Shape, ShapeGeometry } from "three";
import { color } from "@/theme";
import { facesCamera } from "./view";
import { wallBoxes } from "./wall-boxes";

const THICKNESS = 0.1;
const GLASS = color.neutral200;

function useFloorShape(room: Room) {
  return useMemo(() => {
    const shape = new Shape(room.corners.map((c) => ({ x: c.x, y: -c.z }) as never));
    const floor = new ShapeGeometry(shape).rotateX(-Math.PI / 2);
    const slab = new ExtrudeGeometry(shape, { depth: THICKNESS, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, -THICKNESS - 0.002, 0);
    return { floor, slab };
  }, [room.corners]);
}

/** The floor, its slab, and the walls with their door and window openings. Walls that face the camera are hidden so you can see in. */
export function RoomShell({ room, view }: { room: Room; view: RefObject<{ az: number }> }) {
  const { floor, slab } = useFloorShape(room);
  useEffect(() => () => (floor.dispose(), slab.dispose()), [floor, slab]);
  const walls = useMemo(() => getWalls(room), [room]);
  const refs = useMemo(() => walls.map(() => ({ current: null as Group | null })), [walls]);
  useFrame(() => walls.forEach((w, i) => refs[i].current && (refs[i].current.visible = !facesCamera({ x: -w.inward.x, z: -w.inward.z }, view.current.az))));
  return (
    <group>
      <mesh geometry={floor} receiveShadow><meshStandardMaterial color={room.floorColor} roughness={0.75} /></mesh>
      <mesh geometry={slab} receiveShadow><meshStandardMaterial color={color.neutral200} roughness={1} /></mesh>
      {walls.map((w, i) => (
        <group key={w.id} ref={(g) => void (refs[i].current = g)} position={[w.start.x, 0, w.start.z]} rotation={[0, Math.atan2(-w.dir.z, w.dir.x), 0]}>
          {wallBoxes(w.length, room.height, room.openings.filter((o) => o.wall === w.index)).map((b, j) => (
            <mesh key={j} position={[(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, -THICKNESS / 2]} castShadow receiveShadow>
              <boxGeometry args={[b.x1 - b.x0, b.y1 - b.y0, THICKNESS]} />
              <meshStandardMaterial color={room.wallColor} roughness={1} />
            </mesh>
          ))}
          {room.openings.filter((o) => o.wall === w.index && o.type === "window").map((o) => (
            <mesh key={o.id} position={[o.offset + o.width / 2, o.sill + o.height / 2, -THICKNESS / 2]}>
              <planeGeometry args={[o.width, o.height]} />
              <meshStandardMaterial color={GLASS} transparent opacity={0.35} roughness={0.1} side={DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
