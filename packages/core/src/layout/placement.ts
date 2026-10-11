/**
 * Placement solver. The AI (or the UI) states intent - "against the west
 * wall", "in front of the sofa", "near the window" - and this module turns
 * it into a concrete pose that fits: inside the room, not overlapping
 * anything, not blocking doors, and not ruining the walkways.
 */
import { typeInfo } from "../catalog";
import {
  COMPASS_DIR,
  add,
  angleDiff,
  dist,
  dot,
  extentAlong,
  frontDir,
  localXDir,
  norm,
  normDeg,
  obbDistance,
  obbOf,
  pointObbDistance,
  rotationFacing,
  scale,
  snapAngle,
  sub,
} from "../geometry";
import { findWall, getWalls, openingCenter, roomBounds, roomCenter, type Wall } from "../room";
import { getObject, objectObb } from "../scene";
import type { Compass, Pose, Scene, SceneObject, Vec2 } from "../types";
import { analyzeClearance } from "./clearance";
import { checkPose } from "./validate";

export const SIDES = ["front", "back", "left", "right", "north", "south", "east", "west", "under"] as const;
export type Side = (typeof SIDES)[number];

export const FACINGS = [
  "into_room",
  "toward_target",
  "away_from_target",
  "same_as_target",
  "along_wall",
  "keep",
  "north",
  "south",
  "east",
  "west",
] as const;
export type Facing = (typeof FACINGS)[number];

export type Placement =
  | {
      type: "against_wall";
      wall: string;
      slide_toward?: Compass | "center";
      align_with?: string;
      gap_m?: number;
      facing?: Facing;
    }
  | { type: "next_to"; target: string; side: Side; gap_m?: number; facing?: Facing }
  | { type: "near"; target: string; facing?: Facing }
  | { type: "nudge"; direction: Compass | "toward_target" | "away_from_target"; target?: string; distance_m: number };

export type PlaceResult =
  | { ok: true; pose: Pose; notes: string[] }
  | { ok: false; reason: string };

interface Candidate {
  pose: Pose;
  cost: number;
}

interface Target {
  point: Vec2;
  label: string;
  object?: SceneObject;
  wall?: Wall;
}

const COMPASS_SET = new Set(["north", "south", "east", "west"]);

/** Resolve a target id: object, opening, wall, "center" or "corner_ne" etc. */
export function resolveTarget(scene: Scene, target: string): Target | undefined {
  const key = target.trim();
  const obj = getObject(scene, key);
  if (obj) return { point: { x: obj.x, z: obj.z }, label: obj.id, object: obj };
  const opening = scene.room.openings.find((o) => o.id === key);
  if (opening) return { point: openingCenter(scene.room, opening, 0.05), label: opening.id };
  const lower = key.toLowerCase();
  if (lower === "center" || lower === "room_center" || lower === "centre") {
    return { point: roomCenter(scene.room), label: "room centre" };
  }
  const corner = /^corner_(n|s)(e|w)$/.exec(lower);
  if (corner) {
    const sx = corner[2] === "e" ? 1 : -1;
    const sz = corner[1] === "s" ? 1 : -1;
    let best = scene.room.corners[0];
    for (const c of scene.room.corners) if (sx * c.x + sz * c.z > sx * best.x + sz * best.z) best = c;
    return { point: best, label: `${lower.replace("_", " ")}` };
  }
  const wall = findWall(scene.room, lower.replace(/_wall$/, ""));
  if (wall) return { point: add(add(wall.start, scale(wall.dir, wall.length / 2)), scale(wall.inward, 0.05)), label: `${wall.id} wall`, wall };
  return undefined;
}

function halfExtent(obj: SceneObject, rotation: number, dir: Vec2): number {
  return extentAlong(obbOf({ x: 0, z: 0, rotation }, obj.w, obj.d), dir);
}

/** Snap a facing angle: to 90° steps when close, otherwise to 15°. */
function snapFacing(deg: number): number {
  const right = snapAngle(deg, 90);
  return angleDiff(deg, right) <= 20 ? right : snapAngle(deg, 15);
}

function rotationsFor(
  obj: SceneObject,
  facing: Facing | undefined,
  ctx: { target?: Target; wall?: Wall; defaults: Facing },
): ((pos: Vec2) => number)[] {
  const f = facing ?? ctx.defaults;
  const fixed = (r: number) => () => normDeg(r);
  switch (f) {
    case "keep":
      return [fixed(obj.rotation)];
    case "north":
    case "south":
    case "east":
    case "west":
      return [fixed(rotationFacing(COMPASS_DIR[f]))];
    case "into_room":
      if (ctx.wall) return [fixed(ctx.wall.facingRotation)];
      return [(pos) => snapAngle(rotationFacing(sub(ctx.target?.point ?? pos, pos)), 90)];
    case "along_wall":
      if (ctx.wall) return [fixed(ctx.wall.facingRotation + 90), fixed(ctx.wall.facingRotation - 90)];
      return [fixed(obj.rotation + 90)];
    case "same_as_target":
      return [fixed(ctx.target?.object?.rotation ?? obj.rotation)];
    case "toward_target":
    case "away_from_target": {
      const t = ctx.target;
      if (!t) return [fixed(obj.rotation)];
      const flip = f === "away_from_target" ? 180 : 0;
      return [(pos) => snapFacing(rotationFacing(sub(t.point, pos)) + flip)];
    }
  }
}

/** Candidate rotations for "anywhere" searches: current first, then walls. */
function freeRotations(obj: SceneObject): ((pos: Vec2) => number)[] {
  const rs = [obj.rotation, 0, 90, 180, 270];
  const out: number[] = [];
  for (const r of rs) if (!out.some((o) => angleDiff(o, r) < 1)) out.push(normDeg(r));
  return out.map((r) => () => r);
}

function rotationCost(obj: SceneObject, rotation: number): number {
  return angleDiff(obj.rotation, rotation) / 900; // 0.1 per 90°
}

/**
 * Pick the best valid candidate. Among the cheapest valid ones, prefer the
 * one that keeps doors and furniture reachable with comfortable walkways.
 */
function solve(
  scene: Scene,
  obj: SceneObject,
  candidates: Candidate[],
  opts: { ignore?: Set<string>; clearance?: boolean; maxValid?: number } = {},
): PlaceResult {
  if (!candidates.length) return { ok: false, reason: "no possible position" };
  candidates.sort((a, b) => a.cost - b.cost);
  const ignore = opts.ignore ?? new Set<string>();
  const valid: (Candidate & { warnings: string[] })[] = [];
  let firstReason = "";
  const maxValid = opts.maxValid ?? 10;
  for (const c of candidates) {
    // Once we have a valid option, don't wander far for alternatives.
    if (valid.length && c.cost > valid[0].cost + 1.0) break;
    // Keep the shortlist diverse: near-duplicates would all share the same
    // walkway problem.
    if (valid.some((v) => Math.abs(v.pose.rotation - c.pose.rotation) < 1 && Math.hypot(v.pose.x - c.pose.x, v.pose.z - c.pose.z) < 0.25)) continue;
    const chk = checkPose(scene, obj, c.pose, ignore);
    if (chk.ok) {
      valid.push({ ...c, warnings: chk.warnings });
      if (valid.length >= maxValid) break;
    } else if (!firstReason) {
      firstReason = chk.reasons.join("; ");
    }
  }
  if (!valid.length) return { ok: false, reason: firstReason || "no valid position" };

  const useClearance = (opts.clearance ?? true) && !typeInfo(obj.type).floorLevel && valid.length > 1;
  let best = valid[0];
  let bestScore = Infinity;
  for (const c of valid) {
    let score = c.cost + c.warnings.length * 0.5;
    if (useClearance) {
      const trial = {
        ...scene,
        objects: scene.objects
          .filter((o) => o.id === obj.id || !ignore.has(o.id))
          .map((o) => (o.id === obj.id ? { ...o, ...c.pose } : o)),
      };
      if (!trial.objects.some((o) => o.id === obj.id)) trial.objects.push({ ...obj, ...c.pose });
      score += clearancePenalty(trial);
    }
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return { ok: true, pose: roundPose(best.pose), notes: best.warnings };
}

/** Cost of a layout's walkway problems, in "metres of displacement". */
export function clearancePenalty(scene: Scene): number {
  const report = analyzeClearance(scene, { cell: 0.1, overlay: false });
  const min = scene.constraints.minWalkway;
  let p = 0;
  for (const a of report.access) {
    if (a.width < 0.45) p += 3;
    else p += Math.max(0, min - a.width) * 5;
  }
  return p;
}

function roundPose(p: Pose): Pose {
  return { x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100, rotation: normDeg(Math.round(p.rotation)) };
}

function wallCandidates(
  scene: Scene,
  obj: SceneObject,
  pl: Extract<Placement, { type: "against_wall" }>,
): Candidate[] | string {
  const wall = findWall(scene.room, pl.wall.replace(/_wall$/, ""));
  if (!wall) {
    const ids = getWalls(scene.room).map((w) => w.id).join(", ");
    return `unknown wall "${pl.wall}" (walls: ${ids})`;
  }
  const gap = pl.gap_m ?? 0;
  const alignObj = pl.align_with ? resolveTarget(scene, pl.align_with) : undefined;
  if (pl.align_with && !alignObj) return `unknown align_with target "${pl.align_with}"`;
  const rotations = rotationsFor(obj, pl.facing, { wall, defaults: "into_room", target: alignObj });
  const out: Candidate[] = [];
  let tooLong = true;
  for (const rot of rotations) {
    const r = rot({ x: 0, z: 0 });
    const perp = halfExtent(obj, r, wall.inward);
    const along = halfExtent(obj, r, wall.dir);
    if (2 * along > wall.length + 1e-6) continue;
    tooLong = false;
    let tStar = wall.length / 2;
    if (alignObj) {
      tStar = dot(sub(alignObj.point, wall.start), wall.dir);
    } else if (pl.slide_toward && pl.slide_toward !== "center") {
      const s = dot(wall.dir, COMPASS_DIR[pl.slide_toward]);
      if (Math.abs(s) > 0.3) tStar = s > 0 ? wall.length - along : along;
    }
    for (let t = along; t <= wall.length - along + 1e-6; t += 0.05) {
      const p = add(add(wall.start, scale(wall.dir, t)), scale(wall.inward, gap + perp));
      out.push({ pose: { x: p.x, z: p.z, rotation: r }, cost: Math.abs(t - tStar) + rotationCost(obj, r) });
    }
  }
  if (tooLong) return `the ${wall.id} wall is ${wall.length.toFixed(2)} m long, too short for ${obj.id} (${Math.max(obj.w, obj.d).toFixed(2)} m)`;
  return out;
}

export function defaultGap(obj: SceneObject, target: SceneObject | undefined, side: Side): number {
  const info = typeInfo(obj.type);
  if (side === "under") return 0;
  if (side === "front") {
    if (target?.type === "tv_unit" && ["sofa", "armchair", "majlis_seat", "bench"].includes(obj.type)) return 2.4;
    if (info.tucksUnder && target && typeInfo(target.type).hasKneeSpace) return -0.1;
    if (obj.type === "coffee_table" || target?.type === "coffee_table") return 0.45;
    return 0.6;
  }
  if (side === "left" || side === "right") {
    return ["side_table", "nightstand", "floor_lamp", "plant"].includes(obj.type) ? 0.05 : 0.1;
  }
  if (side === "back") return 0.05;
  return 0.1;
}

function sideDirection(target: SceneObject, side: Side): Vec2 {
  switch (side) {
    case "front":
      return frontDir(target.rotation);
    case "back":
      return scale(frontDir(target.rotation), -1);
    case "left":
      return localXDir(target.rotation);
    case "right":
      return scale(localXDir(target.rotation), -1);
    case "under":
      return { x: 0, z: 0 };
    default:
      return COMPASS_DIR[side];
  }
}

function nextToCandidates(
  scene: Scene,
  obj: SceneObject,
  pl: Extract<Placement, { type: "next_to" }>,
): Candidate[] | string {
  const target = resolveTarget(scene, pl.target);
  if (!target) return `unknown target "${pl.target}"`;
  if (target.object?.id === obj.id) return "an object cannot be placed next to itself";
  const side = pl.side;
  if (side === "under" && !typeInfo(obj.type).floorLevel) return "only rugs can go under other furniture";
  const tObj = target.object;
  const dir = tObj ? sideDirection(tObj, side) : COMPASS_SET.has(side) ? COMPASS_DIR[side as Compass] : undefined;
  if (!dir) return `side "${side}" needs an object target (use near for openings and walls)`;
  const lateral = { x: -dir.z, z: dir.x };
  const gap = pl.gap_m ?? defaultGap(obj, tObj, side);
  const defaults: Facing = side === "front" ? "toward_target" : "same_as_target";
  const rotations = rotationsFor(obj, pl.facing, { target, defaults });
  const tBox = tObj ? objectObb(tObj) : undefined;
  const tExt = tBox ? extentAlong(tBox, dir) : 0;
  const out: Candidate[] = [];
  for (const rot of rotations) {
    const r0 = rot(add(target.point, scale(dir, tExt + gap + 0.5)));
    const ext = side === "under" ? 0 : halfExtent(obj, r0, dir);
    const base = add(target.point, scale(dir, tExt + gap + ext));
    for (let a = -0.1; a <= 0.6 + 1e-6; a += 0.05) {
      for (let l = -1.2; l <= 1.2 + 1e-6; l += 0.05) {
        const p = add(add(base, scale(dir, a)), scale(lateral, l));
        const r = rot(p);
        out.push({
          pose: { x: p.x, z: p.z, rotation: r },
          cost: Math.abs(l) + 1.5 * Math.abs(a) + rotationCost(obj, r),
        });
      }
    }
  }
  return out;
}

function nearCandidates(scene: Scene, obj: SceneObject, pl: Extract<Placement, { type: "near" }>): Candidate[] | string {
  const target = resolveTarget(scene, pl.target);
  if (!target) return `unknown target "${pl.target}"`;
  if (target.object?.id === obj.id) return "an object cannot be placed near itself";
  const b = roomBounds(scene.room);
  const isCorner = /^corner_/.test(pl.target.toLowerCase());
  const rotations = pl.facing
    ? rotationsFor(obj, pl.facing, { target, wall: target.wall, defaults: "keep" })
    : freeRotations(obj);
  const tBox = target.object ? objectObb(target.object) : undefined;
  const out: Candidate[] = [];
  for (let x = b.minX + 0.05; x <= b.maxX; x += 0.1) {
    for (let z = b.minZ + 0.05; z <= b.maxZ; z += 0.1) {
      const p = { x, z };
      for (const rot of rotations) {
        const r = rot(p);
        const box = obbOf({ x, z, rotation: r }, obj.w, obj.d);
        const d = isCorner ? dist(p, target.point) : tBox ? obbDistance(box, tBox) : pointObbDistance(target.point, box);
        out.push({ pose: { x, z, rotation: r }, cost: d + rotationCost(obj, r) });
      }
    }
  }
  return out;
}

function nudge(scene: Scene, obj: SceneObject, pl: Extract<Placement, { type: "nudge" }>, ignore: Set<string>): PlaceResult {
  let dir: Vec2;
  if (pl.direction === "toward_target" || pl.direction === "away_from_target") {
    const t = pl.target ? resolveTarget(scene, pl.target) : undefined;
    if (!t) return { ok: false, reason: `nudge ${pl.direction} needs a valid target` };
    dir = norm(sub(t.point, { x: obj.x, z: obj.z }));
    if (pl.direction === "away_from_target") dir = scale(dir, -1);
  } else {
    dir = COMPASS_DIR[pl.direction];
  }
  const want = Math.max(0, pl.distance_m);
  let lastReason = "";
  for (let d = want; d >= -1e-6; d -= 0.05) {
    const p = add({ x: obj.x, z: obj.z }, scale(dir, d));
    const pose = { x: p.x, z: p.z, rotation: obj.rotation };
    const chk = checkPose(scene, obj, pose, ignore);
    if (chk.ok) {
      const notes = [...chk.warnings];
      if (want - d > 0.02) notes.push(`moved ${Math.round(d * 100)} cm of the ${Math.round(want * 100)} cm asked (${lastReason})`);
      return { ok: true, pose: roundPose(pose), notes };
    }
    if (!lastReason) lastReason = chk.reasons.join("; ");
  }
  return { ok: false, reason: lastReason || "blocked" };
}

/** Resolve a placement intent for an object into a valid pose. */
export function resolvePlacement(
  scene: Scene,
  obj: SceneObject,
  pl: Placement,
  opts: { ignore?: Set<string>; clearance?: boolean } = {},
): PlaceResult {
  const ignore = opts.ignore ?? new Set<string>();
  if (pl.type === "nudge") return nudge(scene, obj, pl, ignore);
  const cands =
    pl.type === "against_wall"
      ? wallCandidates(scene, obj, pl)
      : pl.type === "next_to"
        ? nextToCandidates(scene, obj, pl)
        : nearCandidates(scene, obj, pl);
  if (typeof cands === "string") return { ok: false, reason: cands };
  // "next_to" is a precise request (coffee table in front of the sofa):
  // honour it rather than drifting sideways for slightly wider walkways.
  const clearance = opts.clearance ?? pl.type !== "next_to";
  return solve(scene, obj, cands, { ignore, clearance });
}

/** Find any valid spot as close as possible to a preferred point. */
export function placeNearPoint(scene: Scene, obj: SceneObject, point: Vec2, ignore = new Set<string>()): PlaceResult {
  const b = roomBounds(scene.room);
  const out: Candidate[] = [];
  for (const rot of freeRotations(obj)) {
    for (let x = b.minX + 0.05; x <= b.maxX; x += 0.05) {
      for (let z = b.minZ + 0.05; z <= b.maxZ; z += 0.05) {
        const r = rot({ x, z });
        out.push({ pose: { x, z, rotation: r }, cost: dist({ x, z }, point) + rotationCost(obj, r) });
      }
    }
  }
  return solve(scene, obj, out, { ignore, clearance: false, maxValid: 1 });
}

/**
 * Best free spot anywhere in the room for a new piece: valid, keeps every
 * piece (including itself) reachable, and reasonably central.
 */
export function placeAnywhere(scene: Scene, obj: SceneObject): PlaceResult {
  const b = roomBounds(scene.room);
  const center = roomCenter(scene.room);
  const valid: Candidate[] = [];
  let firstReason = "";
  for (const rot of freeRotations(obj)) {
    for (let x = b.minX + 0.05; x <= b.maxX; x += 0.15) {
      for (let z = b.minZ + 0.05; z <= b.maxZ; z += 0.15) {
        const pose = { x, z, rotation: rot({ x, z }) };
        const chk = checkPose(scene, obj, pose);
        if (chk.ok && !chk.warnings.length) valid.push({ pose, cost: dist({ x, z }, center) });
        else if (!chk.ok && !firstReason) firstReason = chk.reasons.join("; ");
      }
    }
  }
  if (!valid.length) return { ok: false, reason: firstReason || "no free space left in the room" };
  // Spread the shortlist over the room so very different spots get compared.
  valid.sort((a, c) => a.cost - c.cost);
  const picked: Candidate[] = [];
  for (const c of valid) {
    if (picked.some((p) => Math.hypot(p.pose.x - c.pose.x, p.pose.z - c.pose.z) < 0.6 && Math.abs(p.pose.rotation - c.pose.rotation) < 1)) continue;
    picked.push(c);
    if (picked.length >= 24) break;
  }
  let best = picked[0];
  let bestScore = Infinity;
  for (const c of picked) {
    const trial = { ...scene, objects: [...scene.objects, { ...obj, ...c.pose }] };
    const score = clearancePenalty(trial) + c.cost * 0.3;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return { ok: true, pose: roundPose(best.pose), notes: [] };
}

export interface ArrangeResult {
  poses: Map<string, Pose>;
  failed: { id: string; reason: string }[];
}

/**
 * Seat objects around a table (or any centre object), each facing it.
 * Chairs tuck slightly under tables; other seating keeps a 45 cm gap.
 */
export function arrangeAround(
  scene: Scene,
  centerId: string,
  objectIds: string[],
  gapOverride?: number,
): ArrangeResult | string {
  const center = getObject(scene, centerId);
  if (!center) return `unknown centre object "${centerId}"`;
  const objs = objectIds.map((id) => getObject(scene, id));
  const missing = objectIds.filter((_, i) => !objs[i]);
  if (missing.length) return `unknown objects: ${missing.join(", ")}`;
  const items = objs as SceneObject[];
  const ignore = new Set(objectIds);
  const poses = new Map<string, Pose>();
  const failed: { id: string; reason: string }[] = [];
  const cBox = objectObb(center);
  const knee = !!typeInfo(center.type).hasKneeSpace;
  const gapFor = (o: SceneObject) => gapOverride ?? (typeInfo(o.type).tucksUnder && knee ? -0.1 : 0.45);

  // Working scene: already-placed items count as obstacles for later ones.
  let working: Scene = { ...scene, objects: scene.objects.filter((o) => !ignore.has(o.id)) };
  const tryPlace = (o: SceneObject, pose: Pose): boolean => {
    for (const push of [0, 0.05, 0.1, 0.15, 0.2, 0.3]) {
      const dir = norm(sub({ x: pose.x, z: pose.z }, cBox.c));
      const p = add({ x: pose.x, z: pose.z }, scale(dir, push));
      const cand = { x: p.x, z: p.z, rotation: pose.rotation };
      if (checkPose(working, o, cand).ok) {
        const rp = roundPose(cand);
        poses.set(o.id, rp);
        working = { ...working, objects: [...working.objects, { ...o, ...rp }] };
        return true;
      }
    }
    return false;
  };

  const round = center.type === "round_table" || (center.type === "coffee_table" && Math.abs(center.w - center.d) < 0.05 && /round/.test(center.catalogId));
  if (round) {
    const radius = Math.max(center.w, center.d) / 2;
    const n = items.length;
    items.forEach((o, i) => {
      const ang = (center.rotation * Math.PI) / 180 + (2 * Math.PI * i) / n;
      const dir = { x: Math.sin(ang), z: Math.cos(ang) };
      const p = add(cBox.c, scale(dir, radius + gapFor(o) + o.d / 2));
      const pose = { x: p.x, z: p.z, rotation: rotationFacing(scale(dir, -1)) };
      if (!tryPlace(o, pose)) failed.push({ id: o.id, reason: "no room on that side of the table" });
    });
    return { poses, failed };
  }

  type SideSlot = { dir: Vec2; along: Vec2; length: number; items: SceneObject[] };
  const sides: SideSlot[] = [
    { dir: cBox.w, along: cBox.u, length: 2 * cBox.hw, items: [] },
    { dir: scale(cBox.w, -1), along: cBox.u, length: 2 * cBox.hw, items: [] },
    { dir: cBox.u, along: cBox.w, length: 2 * cBox.hd, items: [] },
    { dir: scale(cBox.u, -1), along: cBox.w, length: 2 * cBox.hd, items: [] },
  ];
  // A side is usable if a probe chair fits beyond it.
  const usable = sides.map((s) => {
    const probe = { ...items[0], w: Math.min(items[0].w, 0.45), d: Math.min(items[0].d, 0.45) };
    const p = add(cBox.c, scale(s.dir, extentAlong(cBox, s.dir) + Math.max(gapFor(items[0]), 0) + probe.d / 2 + 0.05));
    return checkPose(working, probe, { x: p.x, z: p.z, rotation: rotationFacing(scale(s.dir, -1)) }).ok;
  });
  const pitch = (o: SceneObject) => Math.max(o.w + 0.08, typeInfo(o.type).tucksUnder ? 0.55 : o.w + 0.15);
  const sorted = [...items].sort((a, b) => b.w - a.w);
  for (const o of sorted) {
    let bestSide = -1;
    let bestFree = -Infinity;
    sides.forEach((s, i) => {
      if (!usable[i]) return;
      const used = s.items.reduce((sum, it) => sum + pitch(it), 0);
      // Allow seats to overhang the table ends a little.
      const free = s.length + 0.3 - used - pitch(o);
      if (free >= 0 && free > bestFree) {
        bestFree = free;
        bestSide = i;
      }
    });
    if (bestSide < 0) failed.push({ id: o.id, reason: "no space left around the table" });
    else sides[bestSide].items.push(o);
  }
  for (const s of sides) {
    const k = s.items.length;
    if (!k) continue;
    const totalPitch = s.items.reduce((sum, it) => sum + pitch(it), 0);
    const span = Math.min(s.length, totalPitch);
    let cursor = -span / 2;
    for (const o of s.items) {
      const slot = (pitch(o) / totalPitch) * span;
      const offset = cursor + slot / 2;
      cursor += slot;
      const rotation = rotationFacing(scale(s.dir, -1));
      const perp = halfExtent(o, rotation, s.dir);
      const p = add(add(cBox.c, scale(s.dir, extentAlong(cBox, s.dir) + gapFor(o) + perp)), scale(s.along, offset));
      if (!tryPlace(o, { x: p.x, z: p.z, rotation })) failed.push({ id: o.id, reason: "blocked by a wall or furniture" });
    }
  }
  return { poses, failed };
}
