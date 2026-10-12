import type { ClearanceReport } from "@buildit/core";
import { useEffect, useMemo } from "react";
import { DataTexture, LinearFilter, RGBAFormat, UnsignedByteType } from "three";
import { color, rust } from "@/theme";
import { overlayPixels, type WalkKind } from "../walk-overlay";

const hex = (c: string, alpha: number): [number, number, number, number] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).concat(Math.round(alpha * 255)) as [number, number, number, number];
const PAINT: Record<WalkKind, [number, number, number, number]> = { walkable: hex(color.accent, 0.26), tight: hex(rust.base, 0.5) };

/** The walking-space overlay laid on the floor: one picture, one draw call. */
export function WalkFloor({ report }: { report: ClearanceReport }) {
  const texture = useMemo(() => {
    const t = new DataTexture(overlayPixels(report, PAINT), report.cols, report.rows, RGBAFormat, UnsignedByteType);
    t.magFilter = LinearFilter;
    t.minFilter = LinearFilter;
    t.needsUpdate = true;
    return t;
  }, [report]);
  useEffect(() => () => texture.dispose(), [texture]);
  const [w, d] = [report.cols * report.cell, report.rows * report.cell];
  return (
    <mesh position={[report.originX + w / 2, 0.006, report.originZ + d / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
