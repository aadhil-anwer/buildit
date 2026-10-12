/**
 * Interior design rules as data and code. Advisory: they produce tips, not a score, until the owner has reviewed the
 * thresholds. Every number below is a commonly cited rule of thumb, not a standard; `source` says where it comes from.
 * Distances are metres. The AI is given these results (with the numbers) and may not invent its own.
 */
import { getCatalogItem } from "../catalog";
import { dot, frontDir, norm, obbDistance, obbOverlap, sub } from "../geometry";
import { objectObb } from "../scene";
import type { Scene, SceneObject } from "../types";

export type TipId = "coffee_table_gap" | "tv_distance" | "conversation_distance" | "rug_under_seating";

export interface DesignRule {
  id: TipId;
  /** The comfortable range, in metres (for the TV rule these are multiples of the screen diagonal, scaled per screen). */
  range: [number, number];
  source: string;
}

/** The thresholds in one place, for review. */
export const DESIGN_RULES: Record<TipId, DesignRule> = {
  coffee_table_gap: { id: "coffee_table_gap", range: [0.3, 0.55], source: "common practice: 35-45 cm between sofa and coffee table is ideal; 30-55 cm is comfortable" },
  tv_distance: { id: "tv_distance", range: [1.5, 2.5], source: "common practice: viewing distance 1.5-2.5 times the screen diagonal (PRODUCT.md)" },
  conversation_distance: { id: "conversation_distance", range: [0, 3.0], source: "common practice: seats that face each other within about 2.4-3.0 m for easy conversation" },
  rug_under_seating: { id: "rug_under_seating", range: [0, 0], source: "common practice: at least the front legs of seating sit on the rug" },
};

export interface DesignTip {
  id: TipId;
  /** True when the room meets the rule. */
  ok: boolean;
  /** The measured value in metres, where the rule is a distance. */
  value?: number;
  /** The range it should fall in, in metres, where it is a distance. */
  ideal?: [number, number];
  objectIds: string[];
}

const SEATING = new Set(["sofa", "armchair", "majlis_seat"]);
const isSeat = (o: SceneObject) => SEATING.has(o.type);
const centreDist = (a: SceneObject, b: SceneObject) => Math.hypot(a.x - b.x, a.z - b.z);
const gap = (a: SceneObject, b: SceneObject) => obbDistance(objectObb(a), objectObb(b));
const faces = (from: SceneObject, to: SceneObject, minDot = 0.5) => dot(frontDir(from.rotation), norm(sub({ x: to.x, z: to.z }, { x: from.x, z: from.z }))) > minDot;
const nearest = <T extends SceneObject>(of: SceneObject, list: T[], by: (a: SceneObject, b: SceneObject) => number) => list.toSorted((a, b) => by(of, a) - by(of, b))[0];

function coffeeTableGap(scene: Scene): DesignTip[] {
  const seats = scene.objects.filter(isSeat);
  return scene.objects.filter((o) => o.type === "coffee_table").flatMap((table) => {
    const facing = seats.filter((s) => faces(s, table));
    const seat = facing.length ? nearest(table, facing, gap) : undefined;
    if (!seat) return [];
    const value = gap(seat, table);
    const [lo, hi] = DESIGN_RULES.coffee_table_gap.range;
    return [{ id: "coffee_table_gap" as const, ok: value >= lo && value <= hi, value, ideal: [lo, hi] as [number, number], objectIds: [seat.id, table.id] }];
  });
}

function tvDistance(scene: Scene): DesignTip[] {
  const seats = scene.objects.filter(isSeat);
  return scene.objects.filter((o) => o.type === "tv_unit").flatMap((tv) => {
    const inches = getCatalogItem(tv.catalogId)?.screenInches;
    const viewers = seats.filter((s) => faces(s, tv));
    const seat = inches && viewers.length ? nearest(tv, viewers, centreDist) : undefined;
    if (!inches || !seat) return [];
    const diagonal = inches * 0.0254;
    const [lo, hi] = DESIGN_RULES.tv_distance.range.map((k) => k * diagonal) as [number, number];
    const value = centreDist(seat, tv);
    return [{ id: "tv_distance" as const, ok: value >= lo && value <= hi, value, ideal: [lo, hi] as [number, number], objectIds: [seat.id, tv.id] }];
  });
}

function conversationDistance(scene: Scene): DesignTip[] {
  const seats = scene.objects.filter(isSeat);
  const pairs = seats.flatMap((a, i) => seats.slice(i + 1).filter((b) => faces(a, b) && faces(b, a)).map((b) => ({ a, b, value: gap(a, b) })));
  if (!pairs.length) return [];
  const worst = pairs.toSorted((x, y) => y.value - x.value)[0];
  const [, hi] = DESIGN_RULES.conversation_distance.range;
  return [{ id: "conversation_distance", ok: worst.value <= hi, value: worst.value, ideal: [0, hi], objectIds: [worst.a.id, worst.b.id] }];
}

function rugUnderSeating(scene: Scene): DesignTip[] {
  const rugs = scene.objects.filter((o) => o.type === "rug");
  return scene.objects.filter((o) => isSeat(o) && o.type === "sofa").flatMap((sofa) => {
    const rug = rugs.find((r) => obbOverlap(objectObb(r), objectObb(sofa)) > 0.05);
    if (!rug) return [];
    const front = { x: sofa.x + frontDir(sofa.rotation).x * (sofa.d / 2 - 0.05), z: sofa.z + frontDir(sofa.rotation).z * (sofa.d / 2 - 0.05) };
    const tiny = objectObb({ x: front.x, z: front.z, rotation: 0, w: 0.02, d: 0.02 });
    return [{ id: "rug_under_seating" as const, ok: obbOverlap(objectObb(rug), tiny) > 0, objectIds: [sofa.id, rug.id] }];
  });
}

/** The tips that apply to this room: one per rule that has something to measure, passing or not. */
export function designTips(scene: Scene): DesignTip[] {
  return [...coffeeTableGap(scene), ...tvDistance(scene), ...conversationDistance(scene), ...rugUnderSeating(scene)];
}
