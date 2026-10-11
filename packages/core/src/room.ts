import {
  add,
  bounds,
  compassOf,
  dist,
  norm,
  obbOf,
  polygonArea,
  polygonCentroid,
  rotationFacing,
  scale,
  signedArea,
  sub,
  type OBB,
} from "./geometry";
import type { Compass, Opening, OpeningType, Room, Vec2 } from "./types";

export interface Wall {
  index: number;
  /** Stable, human-friendly id: "north", or "north_2" when a side repeats. */
  id: string;
  side: Compass;
  start: Vec2;
  end: Vec2;
  length: number;
  /** Unit vector from start to end. */
  dir: Vec2;
  /** Unit vector pointing into the room. */
  inward: Vec2;
  /** Rotation that makes an object face into the room from this wall. */
  facingRotation: number;
}

/** Make the outline clockwise (top-down, north up) as the model requires. */
export function normalizeCorners(corners: Vec2[]): Vec2[] {
  const pts = corners.map((p) => ({ x: p.x, z: p.z }));
  return signedArea(pts) < 0 ? pts.reverse() : pts;
}

export function getWalls(room: Room): Wall[] {
  const c = room.corners;
  const raw = c.map((start, i) => {
    const end = c[(i + 1) % c.length];
    const dir = norm(sub(end, start));
    const inward = { x: -dir.z, z: dir.x };
    const side = compassOf({ x: -inward.x, z: -inward.z });
    return {
      index: i,
      side,
      start,
      end,
      length: dist(start, end),
      dir,
      inward,
      facingRotation: rotationFacing(inward),
    };
  });
  const counts = new Map<Compass, number>();
  for (const w of raw) counts.set(w.side, (counts.get(w.side) ?? 0) + 1);
  const seen = new Map<Compass, number>();
  return raw.map((w) => {
    const n = (seen.get(w.side) ?? 0) + 1;
    seen.set(w.side, n);
    const id = (counts.get(w.side) ?? 0) > 1 ? `${w.side}_${n}` : w.side;
    return { ...w, id };
  });
}

export function findWall(room: Room, idOrIndex: string | number): Wall | undefined {
  const walls = getWalls(room);
  if (typeof idOrIndex === "number") return walls[idOrIndex];
  const key = idOrIndex.trim().toLowerCase();
  return walls.find((w) => w.id === key) ?? walls.find((w) => w.side === key);
}

export function rectangleCorners(width: number, length: number): Vec2[] {
  return [
    { x: 0, z: 0 },
    { x: width, z: 0 },
    { x: width, z: length },
    { x: 0, z: length },
  ];
}

/** Wall index of each side for a room built with rectangleCorners(). */
export const RECT_WALL: Record<Compass, number> = { north: 0, east: 1, south: 2, west: 3 };

export function roomArea(room: Room): number {
  return polygonArea(room.corners);
}

export function roomCenter(room: Room): Vec2 {
  return polygonCentroid(room.corners);
}

export function roomBounds(room: Room) {
  return bounds(room.corners);
}

/** Point on the wall at `along` metres from its start, pushed `inset` into the room. */
export function wallPoint(wall: Wall, along: number, inset = 0): Vec2 {
  return add(add(wall.start, scale(wall.dir, along)), scale(wall.inward, inset));
}

export function openingCenter(room: Room, o: Opening, inset = 0): Vec2 {
  const wall = getWalls(room)[o.wall];
  return wallPoint(wall, o.offset + o.width / 2, inset);
}

/**
 * Floor area that must stay clear in front of an opening.
 * Doors: the swing (a square as deep as the door is wide).
 * Passages: a 0.6 m approach. Windows: a 0.4 m strip, only for tall items.
 */
export function openingZone(room: Room, o: Opening): OBB {
  const wall = getWalls(room)[o.wall];
  const depth = o.type === "door" ? Math.min(Math.max(o.width, 0.6), 1.0) : o.type === "opening" ? 0.6 : 0.4;
  const center = wallPoint(wall, o.offset + o.width / 2, depth / 2);
  return obbOf({ x: center.x, z: center.z, rotation: wall.facingRotation }, o.width, depth);
}

export function openingLabel(o: Opening): string {
  return o.type === "opening" ? "open passage" : o.type;
}

let openingCounter = 0;
export function makeOpening(
  type: OpeningType,
  wall: number,
  offset: number,
  width: number,
  extra: Partial<Pick<Opening, "height" | "sill" | "id">> = {},
): Opening {
  openingCounter += 1;
  return {
    id: extra.id ?? `${type}_${openingCounter}`,
    type,
    wall,
    offset,
    width,
    height: extra.height ?? (type === "window" ? 1.3 : 2.1),
    sill: extra.sill ?? (type === "window" ? 0.9 : 0),
  };
}

/** Give openings ids like door_1, window_2 in wall order. */
export function renumberOpenings(openings: Opening[]): Opening[] {
  const n: Record<string, number> = {};
  return openings.map((o) => {
    n[o.type] = (n[o.type] ?? 0) + 1;
    return { ...o, id: `${o.type}_${n[o.type]}` };
  });
}

/** Clamp openings so they stay on their wall. Returns problems found. */
export function validateOpenings(room: Room): string[] {
  const walls = getWalls(room);
  const problems: string[] = [];
  for (const o of room.openings) {
    const wall = walls[o.wall];
    if (!wall) {
      problems.push(`${o.id} is on a wall that does not exist`);
      continue;
    }
    if (o.offset < -1e-6 || o.offset + o.width > wall.length + 1e-6) {
      problems.push(`${o.id} (${o.width} m wide at ${o.offset} m) does not fit on the ${wall.id} wall (${wall.length.toFixed(2)} m)`);
    }
  }
  return problems;
}

/** Walls shorter than this are refused: nothing sensible fits in them. */
const MIN_WALL = 1;

/**
 * Makes one wall longer (or shorter, with a negative `delta`) by moving the wall that meets its far end,
 * so every angle stays as it was. Returns null when the wall would get shorter than a metre,
 * or when a door or window would no longer fit on its wall.
 */
export function adjustWallLength(room: Room, wall: number, delta: number): Room | null {
  const target = getWalls(room)[wall];
  if (!target || target.length + delta < MIN_WALL) return null;
  const shift = scale(target.dir, delta);
  const n = room.corners.length;
  const corners = room.corners.map((c, i) => (i === (wall + 1) % n || i === (wall + 2) % n ? add(c, shift) : c));
  const moved = { ...room, corners };
  return validateOpenings(moved).length ? null : moved;
}
