/**
 * Room-arrangement traditions as measurable rules: Vastu (India), feng shui (China), ma (Japan: open space)
 * and Gulf/Arabian custom. These are commonly cited rules of thumb, not science, and practitioners differ;
 * none has been reviewed by a practitioner yet (OPEN_ISSUES.md). Compass directions are the room's own
 * (+X east, +Z south: the walls the person named when typing or scanning the room).
 */
import { compassOf, frontDir, obbOverlap, pointInObb, pointSegmentDistance, toDeg, type OBB } from "./geometry";
import { typeInfo } from "./catalog";
import { getWalls, openingCenter, roomArea, roomBounds } from "./room";
import { objectObb } from "./scene";
import type { Compass, FurnitureType, Scene, SceneObject, Vec2 } from "./types";

export const TRADITIONS = ["practical", "vastu", "fengshui", "ma", "arabian"] as const;
export type TraditionId = (typeof TRADITIONS)[number];
export interface TraditionCtx {
  /** The wall that faces Mecca, if the person said; Qibla rules are left out without it. */
  qibla?: Compass;
}
export type RuleStatus = "pass" | "fail" | "na";
export interface TraditionRuleResult {
  id: string;
  status: RuleStatus;
  /** Measured facts behind the verdict, for the words on screen (a compass point, an angle, a percentage). */
  facts: Record<string, string | number>;
}
interface Rule {
  id: string;
  /** The pieces this rule is about: arranging tries their spots against it. */
  types: FurnitureType[];
  check: (scene: Scene, ctx: TraditionCtx) => Omit<TraditionRuleResult, "id">;
}

const NA = { status: "na" as const, facts: {} };
const verdict = (ok: boolean, facts: TraditionRuleResult["facts"] = {}) => ({ status: ok ? ("pass" as const) : ("fail" as const), facts });
const first = (scene: Scene, types: FurnitureType[]) => types.map((t) => scene.objects.find((o) => o.type === t)).find(Boolean);
const back = (o: SceneObject): Vec2 => ({ x: -frontDir(o.rotation).x, z: -frontDir(o.rotation).z });
const door = (scene: Scene) => scene.room.openings.find((o) => o.type === "door");
const angleTo = (from: Vec2, dir: Vec2, to: Vec2) => {
  const v = { x: to.x - from.x, z: to.z - from.z };
  const cos = (dir.x * v.x + dir.z * v.z) / (Math.hypot(v.x, v.z) || 1);
  return toDeg(Math.acos(Math.max(-1, Math.min(1, cos))));
};
/** Which way a person using the piece looks: along a bed and a sofa, at the desk (towards its back). */
const gaze = (o: SceneObject): Vec2 => (o.type === "desk" ? back(o) : frontDir(o.rotation));
const STORAGE: FurnitureType[] = ["wardrobe", "bookshelf", "dresser", "sideboard"];
const ANCHORS: FurnitureType[] = ["bed", "sofa", "majlis_seat", "wardrobe", "bookshelf", "tv_unit", "desk", "sideboard", "dresser"];
const nearWall = (scene: Scene, o: SceneObject, tol = 0.2) => {
  const b = { x: o.x + back(o).x * (o.d / 2), z: o.z + back(o).z * (o.d / 2) };
  return getWalls(scene.room).some((w) => pointSegmentDistance(b, w.start, w.end) < tol);
};

const vastu: Rule[] = [
  { id: "vBedHead", types: ["bed"], check: (s) => { const b = first(s, ["bed"]); if (!b) return NA; const head = compassOf(back(b)); return verdict(head === "south" || head === "east", { head }); } },
  { id: "vStorageSW", types: STORAGE, check: (s) => {
    const all = s.objects.filter((o) => STORAGE.includes(o.type));
    if (!all.length) return NA;
    const r = roomBounds(s.room);
    return verdict(all.every((o) => o.z > (r.minZ + r.maxZ) / 2 || o.x < (r.minX + r.maxX) / 2)); // south or west half
  } },
  { id: "vFaceNE", types: ["desk", "sofa"], check: (s) => { const o = first(s, ["desk", "sofa"]); if (!o) return NA; const faces = compassOf(gaze(o)); return verdict(faces === "north" || faces === "east", { faces }); } },
  { id: "vOpenCentre", types: ANCHORS, check: (s) => {
    const r = roomBounds(s.room);
    const c = { x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2 };
    return verdict(!s.objects.some((o) => !typeInfo(o.type).floorLevel && pointInObb(c, objectObb(o), 0.3)));
  } },
];

const fengShui: Rule[] = [
  { id: "fCommand", types: ["bed", "desk", "sofa"], check: (s) => {
    const o = first(s, ["bed", "desk", "sofa"]);
    const d = door(s);
    if (!o || !d) return NA;
    const angle = Math.round(angleTo(o, gaze(o), openingCenter(s.room, d)));
    return verdict(angle >= 15 && angle <= 100, { angle }); // sees the door, but not straight in line with it
  } },
  { id: "fSolidWall", types: ["bed"], check: (s) => {
    const b = first(s, ["bed"]);
    if (!b) return NA;
    const head = { x: b.x + back(b).x * (b.d / 2 + 0.05), z: b.z + back(b).z * (b.d / 2 + 0.05) };
    const under = s.room.openings.some((o) => o.type === "window" && Math.hypot(openingCenter(s.room, o).x - head.x, openingCenter(s.room, o).z - head.z) < o.width / 2 + b.w / 2 - 0.1);
    return verdict(!under);
  } },
];

const ma: Rule[] = [
  { id: "mOpenFloor", types: ANCHORS, check: (s) => {
    const used = s.objects.filter((o) => !typeInfo(o.type).floorLevel).reduce((a, o) => a + o.w * o.d, 0);
    const pct = Math.round(100 * (1 - used / roomArea(s.room)));
    return verdict(pct >= 60, { pct });
  } },
  { id: "mEdges", types: ANCHORS, check: (s) => {
    const floating = s.objects.filter((o) => ANCHORS.includes(o.type) && !nearWall(s, o)).length;
    return verdict(floating === 0, { floating });
  } },
];

const arabian: Rule[] = [
  { id: "aSeatsOnWalls", types: ["majlis_seat", "sofa"], check: (s) => {
    const seats = s.objects.filter((o) => o.type === "majlis_seat" || o.type === "sofa");
    return seats.length ? verdict(seats.every((o) => nearWall(s, o))) : NA;
  } },
  { id: "aHostFacesDoor", types: ["majlis_seat", "sofa"], check: (s) => {
    const seats = s.objects.filter((o) => o.type === "majlis_seat" || o.type === "sofa").sort((a, b) => b.w - a.w);
    const d = door(s);
    if (!seats.length || !d) return NA;
    const angle = Math.round(angleTo(seats[0], frontDir(seats[0].rotation), openingCenter(s.room, d)));
    return verdict(angle <= 60, { angle });
  } },
  { id: "aPrivacy", types: ["bed", "majlis_seat", "sofa"], check: (s) => {
    const d = door(s);
    if (!d) return NA;
    const wall = getWalls(s.room)[d.wall];
    const c = openingCenter(s.room, d, 1.25);
    // The view straight in through the open door: as wide as the door, 2.5 m into the room.
    const sightline: OBB = { c, u: wall.dir, w: wall.inward, hw: d.width / 2, hd: 1.25 };
    const seen = s.objects.filter((o) => ["bed", "majlis_seat", "sofa"].includes(o.type) && obbOverlap(objectObb(o), sightline) > 0);
    return verdict(seen.length === 0);
  } },
  { id: "aQibla", types: ["bed"], check: (s, ctx) => {
    const b = first(s, ["bed"]);
    if (!b || !ctx.qibla) return NA;
    return verdict(compassOf(frontDir(b.rotation)) !== ctx.qibla, { feet: compassOf(frontDir(b.rotation)) }); // feet not towards the Qibla
  } },
];

const RULES: Record<TraditionId, Rule[]> = { practical: [], vastu, fengshui: fengShui, ma, arabian };

/** Every rule of a tradition, measured in this room. */
export function traditionReport(scene: Scene, id: TraditionId, ctx: TraditionCtx = {}): TraditionRuleResult[] {
  return RULES[id].map((r) => ({ id: r.id, ...r.check(scene, ctx) }));
}

/** How well a room follows a tradition on the rules about these pieces: passes minus fails (rules that don't apply count 0). */
export function traditionFit(scene: Scene, id: TraditionId, ctx: TraditionCtx, types?: FurnitureType[]): number {
  return RULES[id].filter((r) => !types || r.types.some((t) => types.includes(t))).reduce((sum, r) => {
    const { status } = r.check(scene, ctx);
    return sum + (status === "pass" ? 1 : status === "fail" ? -1 : 0);
  }, 0);
}
