/**
 * Interior design rules as data and code. Advisory: they produce tips, not a score, until the owner has reviewed the
 * thresholds. Every number below is a commonly cited rule of thumb, not a standard; `source` says where it comes from.
 * Distances are metres. The AI is given these results (with the numbers) and may not invent its own.
 */
import { getCatalogItem, typeInfo } from "../catalog";
import { dot, frontDir, localXDir, norm, obbDistance, obbInsidePolygon, obbOf, obbOverlap, sub } from "../geometry";
import { openingZone } from "../room";
import { objectObb } from "../scene";
import type { Scene, SceneObject } from "../types";

export type TipId = "coffee_table_gap" | "tv_distance" | "conversation_distance" | "rug_under_seating" | "dining_pullout" | "bed_foot" | "headboard_window" | "bed_pair" | "desk_window";

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
  dining_pullout: { id: "dining_pullout", range: [0.75, 0.9], source: "Neufert / common practice: 75-90 cm behind a dining chair so it can be pulled out" },
  bed_foot: { id: "bed_foot", range: [0.6, 0.9], source: "common practice: at least 60 cm (ideally 90) clear at the foot of a bed to pass" },
  headboard_window: { id: "headboard_window", range: [0, 0], source: "common practice: a bed's headboard is better against solid wall than under a window (draught, light, privacy)" },
  bed_pair: { id: "bed_pair", range: [0, 0], source: "common practice: a nightstand on both sides of a double bed so both sleepers have one" },
  desk_window: { id: "desk_window", range: [0, 0], source: "common practice: a desk sits beside a window, not facing it (glare on the screen) or with it directly behind (backlit screen)" },
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

/** Is a stretch of floor (a box in front of or behind a piece) inside the room and free of other standing furniture? */
function zoneClear(scene: Scene, owner: SceneObject, distance: number, along: 1 | -1, deep: number): boolean {
  const f = frontDir(owner.rotation);
  const centre = { x: owner.x + f.x * along * (owner.d / 2 + distance / 2), z: owner.z + f.z * along * (owner.d / 2 + distance / 2) };
  const box = obbOf({ ...centre, rotation: owner.rotation }, deep, distance);
  const others = scene.objects.filter((o) => o.id !== owner.id && !typeInfo(o.type).floorLevel && !(typeInfo(o.type).hasKneeSpace && owner.type.endsWith("chair")));
  return obbInsidePolygon(box, scene.room.corners) && !others.some((o) => obbOverlap(box, objectObb(o)) > 0.01);
}

function diningPullout(scene: Scene): DesignTip[] {
  return scene.objects.filter((o) => o.type === "dining_chair").map((c) => ({ id: "dining_pullout" as const, ok: zoneClear(scene, c, DESIGN_RULES.dining_pullout.range[0], -1, c.w), objectIds: [c.id] }));
}

function bedFoot(scene: Scene): DesignTip[] {
  return scene.objects.filter((o) => o.type === "bed").map((b) => ({ id: "bed_foot" as const, ok: zoneClear(scene, b, DESIGN_RULES.bed_foot.range[0], 1, b.w), objectIds: [b.id] }));
}

function headboardWindow(scene: Scene): DesignTip[] {
  const windows = scene.room.openings.filter((o) => o.type === "window");
  return scene.objects.filter((o) => o.type === "bed").flatMap((b) => {
    if (!windows.length) return [];
    const under = windows.some((w) => obbOverlap(objectObb(b), openingZone(scene.room, w)) > 0.05 && b.h > w.sill + 0.05);
    return [{ id: "headboard_window" as const, ok: !under, objectIds: [b.id] }];
  });
}

function bedPair(scene: Scene): DesignTip[] {
  const stands = scene.objects.filter((o) => o.type === "nightstand");
  return scene.objects.filter((o) => o.type === "bed" && o.w >= 1.3).map((b) => {
    const beside = stands.filter((n) => obbDistance(objectObb(b), objectObb(n)) < 0.35);
    const sides = new Set(beside.map((n) => Math.sign(dot({ x: n.x - b.x, z: n.z - b.z }, localXDir(b.rotation))) || 1));
    return { id: "bed_pair" as const, ok: sides.size === 2, objectIds: [b.id, ...beside.map((n) => n.id)] };
  });
}

function deskWindow(scene: Scene): DesignTip[] {
  const windows = scene.room.openings.filter((o) => o.type === "window").map((w) => openingZone(scene.room, w).c);
  return scene.objects.filter((o) => o.type === "desk").flatMap((d) => {
    const near = windows.filter((c) => Math.hypot(c.x - d.x, c.z - d.z) < 2.5);
    if (!near.length) return [];
    const straight = near.some((c) => Math.abs(dot(frontDir(d.rotation), norm(sub(c, { x: d.x, z: d.z })))) > 0.7);
    return [{ id: "desk_window" as const, ok: !straight, objectIds: [d.id] }];
  });
}

/** The tips that apply to this room: one per rule that has something to measure, passing or not. */
export function designTips(scene: Scene): DesignTip[] {
  return [...coffeeTableGap(scene), ...tvDistance(scene), ...conversationDistance(scene), ...rugUnderSeating(scene), ...diningPullout(scene), ...bedFoot(scene), ...headboardWindow(scene), ...bedPair(scene), ...deskWindow(scene)];
}
