import { roomBounds, type Scene } from "@buildit/core";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { color } from "@/theme";

const SWEEP_SECONDS = 2.6;

/** While the designer works: a thin gold band sweeps across the floor like a drafting scan, and keeps the canvas drawing (it draws on demand otherwise). Ends when unmounted. */
export function Drafting({ scene }: { scene: Scene }) {
  const band = useRef<Mesh>(null);
  const { minX, maxX, minZ, maxZ } = roomBounds(scene.room);
  useFrame(({ clock, invalidate }) => {
    const k = (clock.elapsedTime % SWEEP_SECONDS) / SWEEP_SECONDS;
    if (band.current) band.current.position.set(minX + k * (maxX - minX), 0.015, (minZ + maxZ) / 2);
    invalidate();
  });
  return (
    <mesh ref={band} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[0.16, maxZ - minZ]} />
      <meshBasicMaterial color={color.accent} transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}
