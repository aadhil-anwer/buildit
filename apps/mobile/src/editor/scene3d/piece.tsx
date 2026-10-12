import { design, type SceneObject } from "@buildit/core";
import { useEffect, useMemo } from "react";
import { BoxGeometry, CylinderGeometry, EdgesGeometry, MeshStandardMaterial } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { color } from "@/theme";
import { partsFor, type Part, type Tone } from "./parts";

const ACCENT: Record<Exclude<Tone, "main">, string> = { linen: design.materials.furniture.linen, wood: design.materials.furniture.wood, dark: color.neutral900, brass: color.accent };

// One material per colour, shared by every piece; the scene has a handful of colours, so none is ever disposed.
const materials = new Map<string, MeshStandardMaterial>();
const materialFor = (hex: string) => {
  const found = materials.get(hex);
  if (found) return found;
  const made = new MeshStandardMaterial({ color: hex, roughness: 0.8 });
  materials.set(hex, made);
  return made;
};

const BEVEL = 0.012;
const geometryFor = (p: Part) => (p.shape === "cyl" ? new CylinderGeometry(p.w / 2, p.w / 2, p.h, 20) : p.h < 0.03 || p.d < 0.03 || p.w < 0.03 ? new BoxGeometry(p.w, p.h, p.d) : new RoundedBoxGeometry(p.w, p.h, p.d, 2, Math.min(BEVEL, p.h / 3, p.w / 3, p.d / 3)));

function PartMesh({ part, main, floorLevel }: { part: Part; main: string; floorLevel: boolean }) {
  const geometry = useMemo(() => geometryFor(part), [part]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={materialFor(part.tone === "main" ? main : ACCENT[part.tone])} position={[part.x, part.y + part.h / 2, part.z]} castShadow={!floorLevel} receiveShadow />;
}

/** A gold outline round the piece's footprint, drawn only for the selected piece. */
function Outline({ w, d }: { w: number; d: number }) {
  const edges = useMemo(() => new EdgesGeometry(new BoxGeometry(w + 0.08, 0.01, d + 0.08)), [w, d]);
  useEffect(() => () => edges.dispose(), [edges]);
  return <lineSegments geometry={edges} position={[0, 0.012, 0]}><lineBasicMaterial color={color.accent} /></lineSegments>;
}

/** One piece of furniture, named by its id so the canvas can find it when it is tapped or dragged. */
export function Piece({ piece, selected, floorLevel }: { piece: SceneObject; selected: boolean; floorLevel: boolean }) {
  const parts = useMemo(() => partsFor(piece), [piece.type, piece.w, piece.d, piece.h]); // the parts depend only on the piece's kind and size, not where it stands
  return (
    <group name={piece.id} position={[piece.x, 0, piece.z]} rotation={[0, (piece.rotation * Math.PI) / 180, 0]}>
      {parts.map((part, i) => <PartMesh key={i} part={part} main={piece.color} floorLevel={floorLevel} />)}
      {selected ? <Outline w={piece.w} d={piece.d} /> : null}
    </group>
  );
}
