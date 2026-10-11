import type { Compass, Pose, Vec2 } from "./types";

export const EPS = 1e-6;

export const v = (x: number, z: number): Vec2 => ({ x, z });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, z: a.z * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.z * b.z;
export const cross = (a: Vec2, b: Vec2): number => a.x * b.z - a.z * b.x;
export const len = (a: Vec2): number => Math.hypot(a.x, a.z);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);
export const norm = (a: Vec2): Vec2 => {
  const l = len(a);
  return l < EPS ? { x: 0, z: 0 } : { x: a.x / l, z: a.z / l };
};

export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Normalise an angle in degrees to [0, 360). */
export function normDeg(deg: number): number {
  const r = deg % 360;
  const out = r < 0 ? r + 360 : r;
  // Also folds -0 into 0.
  return out === 0 || Math.abs(out - 360) < 1e-9 ? 0 : out;
}

/** Smallest absolute difference between two angles in degrees. */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(normDeg(a) - normDeg(b));
  return d > 180 ? 360 - d : d;
}

/** Direction an object's front points to at a given rotation. */
export function frontDir(rotation: number): Vec2 {
  const r = toRad(rotation);
  return { x: Math.sin(r), z: Math.cos(r) };
}

/**
 * Direction of the object's local +X axis. Seen from someone facing the
 * same way as the object this is their LEFT (at rotation 0 the object
 * faces south, and +X is east).
 */
export function localXDir(rotation: number): Vec2 {
  const r = toRad(rotation);
  return { x: Math.cos(r), z: -Math.sin(r) };
}

/** Rotation (degrees) that makes an object face along `dir`. */
export function rotationFacing(dir: Vec2): number {
  return normDeg(toDeg(Math.atan2(dir.x, dir.z)));
}

export const COMPASS_DIR: Record<Compass, Vec2> = {
  north: { x: 0, z: -1 },
  south: { x: 0, z: 1 },
  east: { x: 1, z: 0 },
  west: { x: -1, z: 0 },
};

export function compassOf(dir: Vec2): Compass {
  if (Math.abs(dir.x) >= Math.abs(dir.z)) return dir.x >= 0 ? "east" : "west";
  return dir.z >= 0 ? "south" : "north";
}

/** Compass direction an object at `rotation` faces, e.g. "north-east". */
export function facingLabel(rotation: number): string {
  const names = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"];
  // rotation 0 = south, 90 = east, 180 = north, 270 = west
  const idx = Math.round(normDeg(rotation) / 45) % 8;
  return names[idx];
}

/** Snap to the nearest multiple of `step` degrees. */
export function snapAngle(deg: number, step: number): number {
  return normDeg(Math.round(deg / step) * step);
}

/** Oriented rectangle on the floor. */
export interface OBB {
  c: Vec2;
  /** Unit axes: u = object's local X (width), w = local Z (depth / front). */
  u: Vec2;
  w: Vec2;
  hw: number;
  hd: number;
}

export function obbOf(pose: Pose, width: number, depth: number, pad = 0): OBB {
  return {
    c: { x: pose.x, z: pose.z },
    u: localXDir(pose.rotation),
    w: frontDir(pose.rotation),
    hw: width / 2 + pad,
    hd: depth / 2 + pad,
  };
}

export function obbCorners(b: OBB): Vec2[] {
  const ux = scale(b.u, b.hw);
  const wz = scale(b.w, b.hd);
  return [
    add(add(b.c, ux), wz),
    add(sub(b.c, ux), wz),
    sub(sub(b.c, ux), wz),
    sub(add(b.c, ux), wz),
  ];
}

/** Half-extent of an OBB projected onto a unit axis. */
function projRadius(b: OBB, axis: Vec2): number {
  return b.hw * Math.abs(dot(b.u, axis)) + b.hd * Math.abs(dot(b.w, axis));
}

/**
 * Penetration depth between two OBBs (separating axis theorem).
 * Returns 0 when they do not overlap, otherwise the smallest push needed
 * to separate them.
 */
export function obbOverlap(a: OBB, b: OBB): number {
  const axes = [a.u, a.w, b.u, b.w];
  const d = sub(b.c, a.c);
  let minPen = Infinity;
  for (const axis of axes) {
    const pen = projRadius(a, axis) + projRadius(b, axis) - Math.abs(dot(d, axis));
    if (pen <= 0) return 0;
    if (pen < minPen) minPen = pen;
  }
  return minPen;
}

/** Point in the OBB's local frame. */
function toLocal(b: OBB, p: Vec2): { lx: number; lz: number } {
  const d = sub(p, b.c);
  return { lx: dot(d, b.u), lz: dot(d, b.w) };
}

/** Distance from a point to an OBB (0 if inside). */
export function pointObbDistance(p: Vec2, b: OBB): number {
  const { lx, lz } = toLocal(b, p);
  const dx = Math.max(Math.abs(lx) - b.hw, 0);
  const dz = Math.max(Math.abs(lz) - b.hd, 0);
  return Math.hypot(dx, dz);
}

export function pointInObb(p: Vec2, b: OBB, tol = 0): boolean {
  const { lx, lz } = toLocal(b, p);
  return Math.abs(lx) < b.hw - tol && Math.abs(lz) < b.hd - tol;
}

/** Closest point on segment ab to p, and the parameter t in [0,1]. */
export function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number } {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 < EPS ? 0 : Math.min(1, Math.max(0, dot(sub(p, a), ab) / l2));
  return { point: add(a, scale(ab, t)), t };
}

export function pointSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  return dist(p, closestOnSegment(p, a, b).point);
}

export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Distance from p to the nearest edge of the polygon. */
export function pointPolygonEdgeDistance(p: Vec2, poly: Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const d = pointSegmentDistance(p, poly[i], poly[(i + 1) % poly.length]);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Signed area in the top-down view (north up, +X right, +Z down).
 * Positive means the corners run clockwise on screen.
 */
export function signedArea(poly: Vec2[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a.x * b.z - b.x * a.z;
  }
  return s / 2;
}

export function polygonArea(poly: Vec2[]): number {
  return Math.abs(signedArea(poly));
}

export function polygonCentroid(poly: Vec2[]): Vec2 {
  const a = signedArea(poly);
  if (Math.abs(a) < EPS) {
    const n = poly.length || 1;
    return { x: poly.reduce((s, p) => s + p.x, 0) / n, z: poly.reduce((s, p) => s + p.z, 0) / n };
  }
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const f = p.x * q.z - q.x * p.z;
    cx += (p.x + q.x) * f;
    cz += (p.z + q.z) * f;
  }
  return { x: cx / (6 * a), z: cz / (6 * a) };
}

export function bounds(points: Vec2[]): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}

/** Do segments ab and cd properly cross (touching endpoints don't count)? */
export function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const d1 = cross(sub(b, a), sub(c, a));
  const d2 = cross(sub(b, a), sub(d, a));
  const d3 = cross(sub(d, c), sub(a, c));
  const d4 = cross(sub(d, c), sub(b, c));
  return d1 * d2 < -EPS && d3 * d4 < -EPS;
}

/**
 * Is the OBB fully inside the polygon? Corners must be inside, no room
 * corner may poke into the box (concave rooms) and no wall may cut it.
 */
export function obbInsidePolygon(b: OBB, poly: Vec2[], tol = 0.005): boolean {
  const shrunk: OBB = { ...b, hw: Math.max(b.hw - tol, 0), hd: Math.max(b.hd - tol, 0) };
  const corners = obbCorners(shrunk);
  for (const c of corners) if (!pointInPolygon(c, poly)) return false;
  for (const p of poly) if (pointInObb(p, shrunk)) return false;
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const bb = corners[(i + 1) % 4];
    for (let j = 0; j < poly.length; j++) {
      if (segmentsCross(a, bb, poly[j], poly[(j + 1) % poly.length])) return false;
    }
  }
  return true;
}

/** Closest point of an OBB to p (p itself if inside). */
export function closestOnObb(p: Vec2, b: OBB): Vec2 {
  const { lx, lz } = toLocal(b, p);
  const cx = Math.max(-b.hw, Math.min(b.hw, lx));
  const cz = Math.max(-b.hd, Math.min(b.hd, lz));
  return { x: b.c.x + b.u.x * cx + b.w.x * cz, z: b.c.z + b.u.z * cx + b.w.z * cz };
}

/** Does segment pq pass through the interior of the OBB? */
export function segmentHitsObb(p: Vec2, q: Vec2, b: OBB, shrink = 0.01): boolean {
  const a = toLocal(b, p);
  const c = toLocal(b, q);
  const hw = b.hw - shrink;
  const hd = b.hd - shrink;
  if (hw <= 0 || hd <= 0) return false;
  let t0 = 0;
  let t1 = 1;
  const dx = c.lx - a.lx;
  const dz = c.lz - a.lz;
  const clip = (den: number, num: number): boolean => {
    // Liang-Barsky: keep the part of the segment where den*t <= num.
    if (Math.abs(den) < EPS) return num >= 0;
    const t = num / den;
    if (den > 0) {
      if (t < t1) t1 = t;
    } else if (t > t0) t0 = t;
    return t0 <= t1;
  };
  return (
    clip(dx, hw - a.lx) &&
    clip(-dx, hw + a.lx) &&
    clip(dz, hd - a.lz) &&
    clip(-dz, hd + a.lz) &&
    t1 - t0 > EPS
  );
}

/** Shortest distance between two OBBs (0 if they overlap). */
export function obbDistance(a: OBB, b: OBB): number {
  if (obbOverlap(a, b) > 0) return 0;
  let best = Infinity;
  for (const p of obbCorners(a)) best = Math.min(best, pointObbDistance(p, b));
  for (const p of obbCorners(b)) best = Math.min(best, pointObbDistance(p, a));
  return best;
}

/** Half the size of an OBB measured along a unit direction. */
export function extentAlong(b: Pick<OBB, "u" | "w" | "hw" | "hd">, dir: Vec2): number {
  return b.hw * Math.abs(dot(b.u, dir)) + b.hd * Math.abs(dot(b.w, dir));
}

export const round = (n: number, step = 0.01) => Math.round(n / step) * step;
export const round2 = (n: number) => Math.round(n * 100) / 100;
