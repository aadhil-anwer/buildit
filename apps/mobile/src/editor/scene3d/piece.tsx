import { design, type SceneObject } from "@buildit/core";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, EdgesGeometry, MathUtils, MeshStandardMaterial, type Group } from "three";
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
const radiusOf = (p: Part) => Math.min(p.r ?? BEVEL, p.h / 3, p.w / 3, p.d / 3);
const geometryFor = (p: Part) => (p.shape === "cyl" ? new CylinderGeometry(p.w / 2, p.w / 2, p.h, 20) : p.h < 0.03 || p.d < 0.03 || p.w < 0.03 ? new BoxGeometry(p.w, p.h, p.d) : new RoundedBoxGeometry(p.w, p.h, p.d, 3, radiusOf(p)));

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

const GLIDE_RATE = 7; // per second: a move of 1 m takes about half a second to settle

/** Moves the piece's group to where the scene says it stands; with `glide` it eases there instead of jumping. Dragging moves the group directly and is left alone: only a changed target moves it. */
function useStandAt(group: React.RefObject<Group | null>, x: number, z: number, glide: boolean) {
  const goal = useRef({ x, z, fresh: true });
  if (goal.current.x !== x || goal.current.z !== z) goal.current = { x, z, fresh: true };
  useFrame(({ invalidate }, dt) => {
    const g = group.current;
    if (!g) return;
    const to = goal.current;
    if (to.fresh && !glide) {
      g.position.set(x, 0, z);
      to.fresh = false;
      return;
    }
    if (!to.fresh) return;
    g.position.x = MathUtils.damp(g.position.x, x, GLIDE_RATE, dt);
    g.position.z = MathUtils.damp(g.position.z, z, GLIDE_RATE, dt);
    if (Math.hypot(g.position.x - x, g.position.z - z) > 0.002) return invalidate();
    g.position.set(x, 0, z);
    to.fresh = false;
  });
}

/** One piece of furniture, named by its id so the canvas can find it when it is tapped or dragged. `glide` eases it to a new place (while the designer works); `marked` outlines it. */
export function Piece({ piece, selected, floorLevel, glide = false, marked = false }: { piece: SceneObject; selected: boolean; floorLevel: boolean; glide?: boolean; marked?: boolean }) {
  const parts = useMemo(() => partsFor(piece), [piece.type, piece.w, piece.d, piece.h]); // the parts depend only on the piece's kind and size, not where it stands
  const group = useRef<Group>(null);
  useStandAt(group, piece.x, piece.z, glide);
  return (
    <group ref={group} name={piece.id} rotation={[0, (piece.rotation * Math.PI) / 180, 0]}>
      {parts.map((part, i) => <PartMesh key={i} part={part} main={piece.color} floorLevel={floorLevel} />)}
      {selected || marked ? <Outline w={piece.w} d={piece.d} /> : null}
    </group>
  );
}
