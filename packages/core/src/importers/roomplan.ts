/**
 * Import an Apple RoomPlan scan (CapturedRoom encoded with JSONEncoder on
 * the iPhone) into a Scene.
 *
 * The parser is deliberately tolerant because the exact JSON shape depends
 * on the iOS version: categories may be strings or {"door": {...}} objects,
 * transforms may be flat 16-number arrays or 4 column arrays. Both are
 * column-major (simd_float4x4), so the translation is elements 12-14.
 *
 * Not yet verified against a capture from a real device: treat as a
 * starting point and check the first real scans carefully.
 */
import { getWalls, normalizeCorners, renumberOpenings } from "../room";
import { createScene } from "../scene";
import { CATALOG } from "../catalog";
import { dist, dot, frontDir, normDeg, obbOf, pointInObb, pointSegmentDistance, sub, toDeg, type OBB } from "../geometry";
import type { FurnitureType, Opening, Scene, SceneObject, Vec2 } from "../types";

interface RPItem {
  category?: unknown;
  dimensions?: unknown;
  transform?: unknown;
  identifier?: unknown;
}

export interface RoomPlanImport {
  scene: Scene;
  notes: string[];
}

export function looksLikeRoomPlan(data: unknown): boolean {
  return !!data && typeof data === "object" && Array.isArray((data as { walls?: unknown }).walls);
}

function categoryName(c: unknown): string {
  if (typeof c === "string") return c;
  if (c && typeof c === "object") {
    const k = Object.keys(c)[0];
    if (k) return k;
  }
  return "unknown";
}

function vec3(d: unknown): [number, number, number] | null {
  if (Array.isArray(d) && d.length >= 3 && d.slice(0, 3).every((n) => typeof n === "number" && Number.isFinite(n))) {
    return [d[0], d[1], d[2]];
  }
  if (d && typeof d === "object" && "x" in d && "y" in d && "z" in d) {
    const o = d as { x: number; y: number; z: number };
    return [o.x, o.y, o.z];
  }
  return null;
}

/** Column-major 4x4 as 16 numbers. */
function matrix(t: unknown): number[] | null {
  if (!Array.isArray(t)) return null;
  const flat = t.length === 4 && t.every(Array.isArray) ? (t as number[][]).flat() : (t as number[]);
  return flat.length === 16 && flat.every((n) => typeof n === "number" && Number.isFinite(n)) ? flat : null;
}

interface Pose3 {
  pos: [number, number, number];
  /** Local x axis projected on the floor. */
  xAxis: Vec2;
  dims: [number, number, number];
}

function pose(item: RPItem): Pose3 | null {
  const m = matrix(item.transform);
  const dims = vec3(item.dimensions);
  if (!m || !dims) return null;
  const ax = { x: m[0], z: m[2] };
  const l = Math.hypot(ax.x, ax.z) || 1;
  return { pos: [m[12], m[13], m[14]], xAxis: { x: ax.x / l, z: ax.z / l }, dims };
}

/** Intersection of two infinite lines (p + t*d). */
function lineIntersect(p: Vec2, d: Vec2, q: Vec2, e: Vec2): Vec2 | null {
  const den = d.x * e.z - d.z * e.x;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((q.x - p.x) * e.z - (q.z - p.z) * e.x) / den;
  return { x: p.x + d.x * t, z: p.z + d.z * t };
}

interface Seg {
  a: Vec2;
  b: Vec2;
  dir: Vec2;
}

/** Chain wall segments into a closed outline by matching endpoints. */
function chainWalls(segs: Seg[], tol = 0.3): Vec2[] | null {
  if (segs.length < 3) return null;
  const used = new Set<number>([0]);
  const order: Seg[] = [segs[0]];
  let end = segs[0].b;
  while (used.size < segs.length) {
    let best = -1;
    let flip = false;
    let bestD = tol;
    segs.forEach((s, i) => {
      if (used.has(i)) return;
      const da = dist(end, s.a);
      const db = dist(end, s.b);
      if (da < bestD) [best, flip, bestD] = [i, false, da];
      if (db < bestD) [best, flip, bestD] = [i, true, db];
    });
    if (best < 0) break;
    const s = segs[best];
    const seg = flip ? { a: s.b, b: s.a, dir: { x: -s.dir.x, z: -s.dir.z } } : s;
    order.push(seg);
    used.add(best);
    end = seg.b;
  }
  if (order.length < 3 || dist(end, order[0].a) > tol) return null;
  const corners: Vec2[] = [];
  for (let i = 0; i < order.length; i++) {
    const prev = order[(i - 1 + order.length) % order.length];
    const cur = order[i];
    const x = lineIntersect(prev.a, prev.dir, cur.a, cur.dir);
    corners.push(x && dist(x, cur.a) < 1 ? x : { x: (prev.b.x + cur.a.x) / 2, z: (prev.b.z + cur.a.z) / 2 });
  }
  return corners;
}

function defaultColor(type: FurnitureType): string {
  return CATALOG.find((c) => c.type === type)?.color ?? "#b9b2a6";
}

const FIXTURE_NAMES: Record<string, string> = {
  refrigerator: "Fridge",
  stove: "Stove",
  oven: "Oven",
  dishwasher: "Dishwasher",
  sink: "Sink",
  toilet: "Toilet",
  bathtub: "Bathtub",
  washerDryer: "Washer/dryer",
  fireplace: "Fireplace",
  stairs: "Stairs",
};

function classify(cat: string, w: number, h: number, d: number): { type: FurnitureType; name: string; seats?: number } {
  const area = w * d;
  switch (cat) {
    case "sofa":
      return { type: "sofa", name: "Sofa (scanned)", seats: Math.max(1, Math.round(w / 0.7)) };
    case "chair":
      return w >= 0.65 && d >= 0.65 ? { type: "armchair", name: "Armchair (scanned)", seats: 1 } : { type: "dining_chair", name: "Chair (scanned)", seats: 1 };
    case "bed":
      return { type: "bed", name: "Bed (scanned)" };
    case "table":
      if (h < 0.55) return area < 0.3 ? { type: "side_table", name: "Side table (scanned)" } : { type: "coffee_table", name: "Coffee table (scanned)" };
      if (Math.max(w, d) >= 1.0 && Math.min(w, d) >= 0.7) return { type: "dining_table", name: "Table (scanned)" };
      if (Math.max(w, d) / Math.min(w, d) > 1.6) return { type: "desk", name: "Desk (scanned)" };
      return { type: "side_table", name: "Small table (scanned)" };
    case "storage":
      if (h >= 1.5) return Math.min(w, d) < 0.45 && w < 1.1 ? { type: "bookshelf", name: "Shelf (scanned)" } : { type: "wardrobe", name: "Wardrobe (scanned)" };
      if (w < 0.7 && h < 0.75) return { type: "nightstand", name: "Nightstand (scanned)" };
      return w >= 1.3 ? { type: "sideboard", name: "Sideboard (scanned)" } : { type: "dresser", name: "Dresser (scanned)" };
    case "television":
      return { type: "tv_unit", name: "TV (scanned)" };
    default:
      return { type: "fixture", name: FIXTURE_NAMES[cat] ?? `${cat} (scanned)` };
  }
}

export function importRoomPlan(data: unknown, name = "Scanned room"): RoomPlanImport {
  if (!looksLikeRoomPlan(data)) throw new Error("This file is not a RoomPlan scan (no walls).");
  const room = data as { walls: RPItem[]; doors?: RPItem[]; windows?: RPItem[]; openings?: RPItem[]; objects?: RPItem[] };
  const notes: string[] = [];

  const walls = room.walls.map(pose).filter((p): p is Pose3 => !!p);
  if (walls.length < 3) throw new Error("The scan has fewer than three readable walls.");
  const floorY = Math.min(...walls.map((w) => w.pos[1] - w.dims[1] / 2));
  const heights = walls.map((w) => w.dims[1]).sort((a, b) => a - b);
  const height = Math.max(2.2, Math.min(6, heights[Math.floor(heights.length / 2)]));

  // Align the longest wall with the x axis. RoomPlan's frame starts where
  // the phone started, so its axes say nothing about real north.
  const longest = walls.reduce((a, b) => (b.dims[0] > a.dims[0] ? b : a));
  const yaw = Math.atan2(longest.xAxis.z, longest.xAxis.x);
  const cos = Math.cos(-yaw);
  const sin = Math.sin(-yaw);
  const rot = (p: Vec2): Vec2 => ({ x: p.x * cos - p.z * sin, z: p.x * sin + p.z * cos });

  const segs: Seg[] = walls.map((w) => {
    const c = rot({ x: w.pos[0], z: w.pos[2] });
    const d = rot(w.xAxis);
    const half = w.dims[0] / 2;
    return { a: { x: c.x - d.x * half, z: c.z - d.z * half }, b: { x: c.x + d.x * half, z: c.z + d.z * half }, dir: d };
  });

  let corners = chainWalls(segs);
  if (!corners) {
    notes.push("Walls did not form a closed outline; used the bounding rectangle instead.");
    const pts = segs.flatMap((s) => [s.a, s.b]);
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minZ = Math.min(...pts.map((p) => p.z));
    const maxZ = Math.max(...pts.map((p) => p.z));
    corners = [
      { x: minX, z: minZ },
      { x: maxX, z: minZ },
      { x: maxX, z: maxZ },
      { x: minX, z: maxZ },
    ];
  }
  const minX = Math.min(...corners.map((p) => p.x));
  const minZ = Math.min(...corners.map((p) => p.z));
  const shift = (p: Vec2): Vec2 => ({ x: +(p.x - minX).toFixed(3), z: +(p.z - minZ).toFixed(3) });
  const toPlan = (x: number, z: number) => shift(rot({ x, z }));
  corners = normalizeCorners(corners.map(shift));

  const scene = createScene({
    name,
    corners,
    height: +height.toFixed(2),
    openings: [],
    floorColor: "#d9cbb6",
    wallColor: "#f2eee8",
  });
  const planWalls = getWalls(scene.room);

  // Doors, windows and open passages: snap to the nearest wall.
  const openings: Opening[] = [];
  const addOpenings = (items: RPItem[] | undefined, type: Opening["type"]) => {
    for (const it of items ?? []) {
      const p = pose(it);
      if (!p) continue;
      const c = toPlan(p.pos[0], p.pos[2]);
      let best = planWalls[0];
      let bestD = Infinity;
      for (const w of planWalls) {
        const dd = pointSegmentDistance(c, w.start, w.end);
        if (dd < bestD) [best, bestD] = [w, dd];
      }
      const width = Math.min(p.dims[0], best.length);
      const along = dot(sub(c, best.start), best.dir);
      const offset = Math.max(0, Math.min(best.length - width, along - width / 2));
      const bottom = p.pos[1] - p.dims[1] / 2 - floorY;
      openings.push({
        id: type,
        type,
        wall: best.index,
        offset: +offset.toFixed(3),
        width: +width.toFixed(3),
        height: +Math.min(p.dims[1], height).toFixed(2),
        sill: type === "window" ? +Math.max(0, bottom).toFixed(2) : 0,
      });
    }
  };
  addOpenings(room.doors, "door");
  addOpenings(room.windows, "window");
  addOpenings(room.openings, "opening");
  scene.room.openings = renumberOpenings(openings);
  if (!openings.some((o) => o.type !== "window")) notes.push("No door was detected; walkway checks start from the most open spot.");

  // Furniture.
  type Raw = { cat: string; c: Vec2; rotation: number; w: number; h: number; d: number; bottom: number };
  const raws: Raw[] = [];
  for (const it of room.objects ?? []) {
    const p = pose(it);
    if (!p) continue;
    const axis = rot(p.xAxis);
    raws.push({
      cat: categoryName(it.category),
      c: toPlan(p.pos[0], p.pos[2]),
      rotation: normDeg(toDeg(Math.atan2(-axis.z, axis.x))),
      w: p.dims[0],
      h: p.dims[1],
      d: p.dims[2],
      bottom: p.pos[1] - p.dims[1] / 2 - floorY,
    });
  }
  // A TV standing on storage becomes one TV unit.
  const boxes = raws.map((r): OBB => obbOf({ x: r.c.x, z: r.c.z, rotation: r.rotation }, r.w, r.d));
  const skip = new Set<number>();
  const tvOnStorage = new Set<number>();
  raws.forEach((r, i) => {
    if (r.cat !== "television") return;
    const host = raws.findIndex((s, j) => s.cat === "storage" && pointInObb(r.c, boxes[j]));
    if (host >= 0) {
      skip.add(i);
      tvOnStorage.add(host);
    }
  });

  const counts: Record<string, number> = {};
  const objects: SceneObject[] = [];
  raws.forEach((r, i) => {
    if (skip.has(i)) return;
    const cls = tvOnStorage.has(i) ? { type: "tv_unit" as const, name: "TV unit (scanned)" } : classify(r.cat, r.w, r.h, r.d);
    const { w } = r;
    let { d, h } = r;
    if (cls.type === "tv_unit" && r.cat === "television") {
      // Wall-mounted or standalone TV: show as a slim TV unit on the floor.
      d = Math.max(d, 0.3);
      h = 0.45;
      if (r.bottom > 0.4) notes.push("A wall-mounted TV is shown as a slim TV unit.");
    }
    counts[cls.type] = (counts[cls.type] ?? 0) + 1;
    // Furniture usually has its back to the nearest wall: pick the facing
    // whose back is closer to a wall.
    let rotation = r.rotation;
    const f = frontDir(rotation);
    const backPt = { x: r.c.x - f.x * (d / 2), z: r.c.z - f.z * (d / 2) };
    const frontPt = { x: r.c.x + f.x * (d / 2), z: r.c.z + f.z * (d / 2) };
    const wallDist = (p: Vec2) => Math.min(...planWalls.map((wl) => pointSegmentDistance(p, wl.start, wl.end)));
    if (wallDist(frontPt) + 0.05 < wallDist(backPt)) rotation = normDeg(rotation + 180);
    objects.push({
      id: `${cls.type}_${counts[cls.type]}`,
      catalogId: `scan_${r.cat}`,
      type: cls.type,
      name: cls.name,
      w: +w.toFixed(2),
      d: +d.toFixed(2),
      h: +h.toFixed(2),
      x: +r.c.x.toFixed(2),
      z: +r.c.z.toFixed(2),
      rotation: Math.round(rotation),
      color: defaultColor(cls.type),
      seats: "seats" in cls ? cls.seats : undefined,
      locked: cls.type === "fixture" ? true : undefined,
    });
  });
  scene.objects = objects;

  notes.unshift(
    `Imported ${planWalls.length} walls, ${scene.room.openings.length} doors/windows and ${objects.length} pieces of furniture.`,
    "Compass directions follow the scan, not real north: the longest wall was lined up east-west.",
  );
  return { scene, notes: [...new Set(notes)] };
}
