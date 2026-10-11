import { typeInfo } from "../catalog";
import {
  add,
  bounds,
  closestOnObb,
  closestOnSegment,
  dot,
  norm,
  obbCorners,
  pointInObb,
  pointInPolygon,
  pointObbDistance,
  pointSegmentDistance,
  round2,
  scale,
  segmentHitsObb,
  segmentsCross,
  sub,
  type OBB,
} from "../geometry";
import { getWalls, openingCenter, openingZone } from "../room";
import { objectObb } from "../scene";
import type { Scene, SceneObject, Vec2 } from "../types";
import type { Issue } from "./validate";

/** How close you need to get to use something (sit down, open a door). */
const REACH = 0.6;
/** Below this a gap is not passable for an adult. */
const MIN_PASSABLE = 0.45;
/** Access widths are reported up to this; wider means "open". */
export const ACCESS_CAP = 2 * REACH;

export interface AccessResult {
  objectId: string;
  /** Width of the narrowest point on the best route from a door (m). */
  width: number;
  /** The two things forming that narrowest point, if known. */
  between?: [string, string];
  pinch?: Vec2;
}

export interface ClearanceReport {
  cell: number;
  cols: number;
  rows: number;
  originX: number;
  originZ: number;
  /**
   * Per cell, for drawing: 0 not floor (outside room or under furniture),
   * 1 comfortably walkable from a door, 2 free floor too tight to walk.
   */
  overlay: Uint8Array;
  access: AccessResult[];
  /** Free floor (not under furniture) as a share of room area. */
  freeFloorRatio: number;
  /** Share of free floor a person can comfortably walk over. */
  walkableRatio: number;
  issues: Issue[];
}

type Obstacle = { id: string; kind: "object"; box: OBB } | { id: string; kind: "wall"; a: Vec2; b: Vec2 };

function obstacleDistance(p: Vec2, ob: Obstacle): number {
  return ob.kind === "object" ? pointObbDistance(p, ob.box) : pointSegmentDistance(p, ob.a, ob.b);
}

/** Closest point of an obstacle to p. */
function obstacleClosest(p: Vec2, ob: Obstacle): Vec2 {
  return ob.kind === "wall" ? closestOnSegment(p, ob.a, ob.b).point : closestOnObb(p, ob.box);
}

function obstacleVertices(ob: Obstacle): Vec2[] {
  return ob.kind === "object" ? obbCorners(ob.box) : [ob.a, ob.b];
}

function obstacleEdges(ob: Obstacle): [Vec2, Vec2][] {
  const v = obstacleVertices(ob);
  if (ob.kind === "wall") return [[v[0], v[1]]];
  return v.map((p, i) => [p, v[(i + 1) % v.length]] as [Vec2, Vec2]);
}

/** Shortest distance between two obstacles (convex shapes). */
function obstacleGap(a: Obstacle, b: Obstacle): number {
  for (const [p, q] of obstacleEdges(a)) {
    for (const [r, s] of obstacleEdges(b)) if (segmentsCross(p, q, r, s)) return 0;
  }
  let best = Infinity;
  for (const p of obstacleVertices(a)) best = Math.min(best, obstacleDistance(p, b));
  for (const p of obstacleVertices(b)) best = Math.min(best, obstacleDistance(p, a));
  return best;
}

/** Binary max-heap keyed by float priority. */
class MaxHeap {
  private keys: number[] = [];
  private vals: number[] = [];
  get size() {
    return this.keys.length;
  }
  push(key: number, val: number) {
    const k = this.keys;
    const v = this.vals;
    k.push(key);
    v.push(val);
    let i = k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] >= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]];
      [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop(): [number, number] {
    const k = this.keys;
    const v = this.vals;
    const top: [number, number] = [k[0], v[0]];
    const lk = k.pop()!;
    const lv = v.pop()!;
    if (k.length) {
      k[0] = lk;
      v[0] = lv;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && k[l] > k[m]) m = l;
        if (r < k.length && k[r] > k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Wall segments people can't pass; doorways and open passages are gaps. */
function wallPieces(scene: Scene): Obstacle[] {
  const out: Obstacle[] = [];
  for (const w of getWalls(scene.room)) {
    const gaps = scene.room.openings
      .filter((o) => o.wall === w.index && o.type !== "window")
      .map((o) => [Math.max(0, o.offset), Math.min(w.length, o.offset + o.width)] as const)
      .sort((a, b) => a[0] - b[0]);
    let t = 0;
    const id = `${w.id} wall`;
    for (const [g0, g1] of gaps) {
      if (g0 > t + 1e-6) out.push({ id, kind: "wall", a: add(w.start, scale(w.dir, t)), b: add(w.start, scale(w.dir, g0)) });
      t = Math.max(t, g1);
    }
    if (w.length > t + 1e-6) out.push({ id, kind: "wall", a: add(w.start, scale(w.dir, t)), b: w.end });
  }
  return out;
}

function needsAccess(o: SceneObject): boolean {
  return typeInfo(o.type).access !== "none";
}

/**
 * Floor zones a person must be able to reach to use the object, as
 * predicates on a point. Storage needs every part of its front reachable
 * (each door); seating and beds need any one spot on a usable side.
 */
function accessZones(o: SceneObject, box: OBB): ((p: Vec2) => boolean)[] {
  const local = (p: Vec2) => {
    const d = sub(p, box.c);
    return { lx: dot(d, box.u), lz: dot(d, box.w) };
  };
  const mode = typeInfo(o.type).access;
  if (mode === "front") {
    const half = Math.max(box.hw - 0.1, box.hw * 0.5);
    return [(p) => {
      const { lx, lz } = local(p);
      return lz > box.hd - 0.05 && Math.abs(lx) <= half;
    }];
  }
  if (mode === "fullFront") {
    const count = Math.max(1, Math.round((2 * box.hw) / 0.5));
    const slot = (2 * box.hw) / count;
    return Array.from({ length: count }, (_, k) => {
      const mid = -box.hw + slot * (k + 0.5);
      return (p: Vec2) => {
        const { lx, lz } = local(p);
        return lz > box.hd - 0.05 && Math.abs(lx - mid) <= Math.max(slot / 2, 0.2);
      };
    });
  }
  if (mode === "notBack") return [(p) => local(p).lz > -box.hd + 0.05];
  return [() => true];
}

export function analyzeClearance(scene: Scene, opts: { cell?: number; minWalkway?: number } = {}): ClearanceReport {
  const cell = opts.cell ?? 0.05;
  const minWalkway = opts.minWalkway ?? scene.constraints.minWalkway;
  const poly = scene.room.corners;
  const b = bounds(poly);
  const cols = Math.max(1, Math.ceil((b.maxX - b.minX) / cell));
  const rows = Math.max(1, Math.ceil((b.maxZ - b.minZ) / cell));
  const n = cols * rows;
  const center = (i: number): Vec2 => ({
    x: b.minX + ((i % cols) + 0.5) * cell,
    z: b.minZ + (Math.floor(i / cols) + 0.5) * cell,
  });

  const solid = scene.objects.filter((o) => !typeInfo(o.type).floorLevel);
  const obstacles: Obstacle[] = [
    ...solid.map((o) => ({ id: o.id, kind: "object" as const, box: objectObb(o) })),
    ...wallPieces(scene),
  ];

  // clearance[i]: distance to the nearest obstacle; -1 = not floor.
  const clearance = new Float32Array(n).fill(-1);
  let insideCount = 0;
  let freeCount = 0;
  for (let i = 0; i < n; i++) {
    const p = center(i);
    if (!pointInPolygon(p, poly)) continue;
    insideCount++;
    let blocked = false;
    let best = Infinity;
    for (const ob of obstacles) {
      if (ob.kind === "object" && pointInObb(p, ob.box)) {
        blocked = true;
        break;
      }
      const d = obstacleDistance(p, ob);
      if (d < best) best = d;
    }
    if (blocked) continue;
    clearance[i] = best;
    freeCount++;
  }

  const cellOf = (p: Vec2): number => {
    const c = Math.floor((p.x - b.minX) / cell);
    const r = Math.floor((p.z - b.minZ) / cell);
    if (c < 0 || r < 0 || c >= cols || r >= rows) return -1;
    return r * cols + c;
  };

  const nearestFree = (p: Vec2): number => {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      if (clearance[i] < 0) continue;
      const q = center(i);
      const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  // Entry points: just inside each door or passage.
  const sources: number[] = [];
  for (const o of scene.room.openings) {
    if (o.type === "window") continue;
    const p = openingCenter(scene.room, o, 0.3);
    const c = cellOf(p);
    sources.push(c >= 0 && clearance[c] >= 0 ? c : nearestFree(p));
  }
  if (sources.length === 0 || sources.every((s) => s < 0)) {
    let best = -1;
    for (let i = 0; i < n; i++) if (clearance[i] >= 0 && (best < 0 || clearance[i] > clearance[best])) best = i;
    if (best >= 0) sources.push(best);
  }

  // The doorway itself is as wide as it is; only furniture narrowing the
  // way counts. Inside door/passage approach zones, treat the floor as open.
  const doorZones = scene.room.openings.filter((o) => o.type !== "window").map((o) => openingZone(scene.room, o));
  const pathClear = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const c = clearance[i];
    pathClear[i] = c >= 0 && doorZones.some((z) => pointInObb(center(i), z)) ? Math.max(c, REACH) : c;
  }

  // Widest path from the entries: bottleneck[i] = largest clearance radius
  // achievable along any route from a door to cell i.
  const bottleneck = new Float32Array(n).fill(-1);
  const prev = new Int32Array(n).fill(-1);
  const heap = new MaxHeap();
  for (const s of sources) {
    if (s < 0 || pathClear[s] < 0) continue;
    if (pathClear[s] > bottleneck[s]) {
      bottleneck[s] = pathClear[s];
      heap.push(pathClear[s], s);
    }
  }
  while (heap.size) {
    const [bn, i] = heap.pop();
    if (bn < bottleneck[i]) continue;
    const c = i % cols;
    const r = Math.floor(i / cols);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const cc = c + dc;
        const rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= cols || rr >= rows) continue;
        const j = rr * cols + cc;
        if (pathClear[j] < 0) continue;
        const nb = Math.min(bn, pathClear[j]);
        if (nb > bottleneck[j]) {
          bottleneck[j] = nb;
          prev[j] = i;
          heap.push(nb, j);
        }
      }
    }
  }

  // Name what forms a pinch point and measure the gap exactly.
  const describePinch = (p: Vec2, fallbackWidth: number): { width: number; between?: [string, string] } => {
    const ranked = obstacles
      .map((ob) => ({ ob, d: obstacleDistance(p, ob), dir: norm(sub(obstacleClosest(p, ob), p)) }))
      .sort((x, y) => x.d - y.d);
    const a = ranked[0];
    if (!a) return { width: fallbackWidth };
    const opposite = ranked.slice(1).find((r) => dot(r.dir, a.dir) < -0.3 && r.ob.id !== a.ob.id);
    if (!opposite) return { width: fallbackWidth };
    const gap = obstacleGap(a.ob, opposite.ob);
    // The exact gap can only be trusted near the grid estimate.
    if (Math.abs(gap - fallbackWidth) > 3 * cell) return { width: fallbackWidth };
    return { width: gap, between: [a.ob.id, opposite.ob.id] };
  };

  const access: AccessResult[] = [];
  const issues: Issue[] = [];
  const solidBoxes = solid.map((o) => ({ id: o.id, box: objectObb(o) }));
  for (const o of solid) {
    if (!needsAccess(o)) continue;
    const box = objectObb(o);
    const others = solidBoxes.filter((s) => s.id !== o.id);
    // Candidate standing spots: close enough to use the object, on a usable
    // side, with nothing in between.
    const near: number[] = [];
    for (let i = 0; i < n; i++) {
      if (bottleneck[i] < 0) continue;
      const p = center(i);
      if (pointObbDistance(p, box) > REACH) continue;
      const q = closestOnObb(p, box);
      if (others.some((s) => segmentHitsObb(p, q, s.box))) continue;
      near.push(i);
    }
    // Each zone must be reachable; the object's access is its worst zone.
    let worst: { val: number; cell: number } | null = null;
    for (const inZone of accessZones(o, box)) {
      const zoneCells = near.filter((i) => inZone(center(i)));
      let bestVal = -1;
      for (const i of zoneCells) if (bottleneck[i] > bestVal) bestVal = bottleneck[i];
      // Among equally reachable spots, take the roomiest one to stand in.
      let bestCell = -1;
      for (const i of zoneCells) {
        if (bottleneck[i] < bestVal - cell * 0.5) continue;
        if (bestCell < 0 || pathClear[i] > pathClear[bestCell]) bestCell = i;
      }
      if (!worst || bestVal < worst.val) worst = { val: bestVal, cell: bestCell };
    }
    if (!worst || worst.cell < 0) {
      access.push({ objectId: o.id, width: 0 });
      issues.push({
        kind: "no_access",
        severity: "error",
        objectIds: [o.id],
        value: 0,
        message: `${o.name} (${o.id}) cannot be reached from a door`,
      });
      continue;
    }
    const bestVal = worst.val;
    // Narrowest point on that route. Several cells can tie on the grid, so
    // measure the real gap at each and report the smallest; on equal gaps
    // prefer one we can name, then the one farther from the object.
    const route: number[] = [];
    for (let i = worst.cell; i >= 0; i = prev[i]) route.push(i);
    const minVal = Math.min(...route.map((i) => pathClear[i]));
    const ties = route.filter((i) => pathClear[i] <= minVal + cell * 0.5);
    const step = Math.max(1, Math.floor(ties.length / 8));
    const gridWidth = Math.min(2 * bestVal, ACCESS_CAP);
    let best: { width: number; between?: [string, string]; cell: number; far: number } | null = null;
    for (let k = 0; k < ties.length; k += step) {
      const i = ties[k];
      const d = gridWidth >= ACCESS_CAP ? { width: ACCESS_CAP } : describePinch(center(i), gridWidth);
      const far = pointObbDistance(center(i), box);
      const better =
        !best ||
        d.width < best.width - 0.01 ||
        (Math.abs(d.width - best.width) <= 0.01 && (!!d.between && !best.between || (!!d.between === !!best.between && far > best.far)));
      if (better) best = { ...d, cell: i, far };
    }
    const pinch = center(best!.cell);
    const described = best!;
    const width = round2(Math.min(described.width, ACCESS_CAP));
    access.push({ objectId: o.id, width, between: described.between, pinch });
    const where = described.between ? ` between ${described.between[0]} and ${described.between[1]}` : "";
    if (width < 0.1) {
      const mode = typeInfo(o.type).access;
      issues.push({
        kind: "no_access",
        severity: "error",
        objectIds: [o.id],
        value: width,
        message:
          mode === "front" || mode === "fullFront"
            ? `${o.id} can't be used: the space in front of it is blocked${where}`
            : `${o.id} can't be reached: it is boxed in${where}`,
      });
    } else if (width < MIN_PASSABLE) {
      issues.push({
        kind: "no_access",
        severity: "error",
        objectIds: [o.id],
        value: width,
        message: `${o.id} is hard to reach: narrowest gap ${Math.round(width * 100)} cm${where}`,
      });
    } else if (width < minWalkway - 0.02) {
      issues.push({
        kind: "narrow_access",
        severity: "warning",
        objectIds: [o.id],
        value: width,
        message: `Path to ${o.id} narrows to ${Math.round(width * 100)} cm${where} (aim for ${Math.round(minWalkway * 100)} cm)`,
      });
    }
  }

  // Overlay: floor a person of shoulder width `minWalkway` can sweep over
  // when coming in from a door.
  const r = minWalkway / 2;
  const isCenter = (i: number) => bottleneck[i] >= r - cell * 0.5;
  const overlay = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (clearance[i] >= 0) overlay[i] = 2;
  const rc = Math.ceil(r / cell);
  for (let i = 0; i < n; i++) {
    if (!isCenter(i)) continue;
    const c = i % cols;
    const rr = Math.floor(i / cols);
    let boundary = false;
    for (let dr = -1; dr <= 1 && !boundary; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const cc = c + dc;
        const r2 = rr + dr;
        if (cc < 0 || r2 < 0 || cc >= cols || r2 >= rows || !isCenter(r2 * cols + cc)) {
          boundary = true;
          break;
        }
      }
    }
    if (!boundary) {
      overlay[i] = 1;
      continue;
    }
    for (let dr = -rc; dr <= rc; dr++) {
      for (let dc = -rc; dc <= rc; dc++) {
        if ((dr * dr + dc * dc) * cell * cell > r * r) continue;
        const cc = c + dc;
        const r2 = rr + dr;
        if (cc < 0 || r2 < 0 || cc >= cols || r2 >= rows) continue;
        const j = r2 * cols + cc;
        if (overlay[j] === 2) overlay[j] = 1;
      }
    }
  }
  let walkable = 0;
  for (let i = 0; i < n; i++) if (overlay[i] === 1) walkable++;

  return {
    cell,
    cols,
    rows,
    originX: b.minX,
    originZ: b.minZ,
    overlay,
    access,
    freeFloorRatio: insideCount ? round2(freeCount / insideCount) : 0,
    walkableRatio: freeCount ? round2(walkable / freeCount) : 0,
    issues,
  };
}
