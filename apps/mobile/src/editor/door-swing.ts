import { getWalls, wallPoint, type Room, type Vec2 } from "@buildit/core";

/** A door's swing on the floor: the hinge, and the quarter circle the door sweeps from closed (along the wall) to open (into the room). */
export interface Swing {
  openingId: string;
  hinge: Vec2;
  /** Along the wall, towards the rest of the opening. */
  along: Vec2;
  /** Into the room, at right angles to the wall. */
  into: Vec2;
  radius: number;
}

/** Where each door in the room swings. Hinged at the start of the opening. Windows and open passages do not swing. */
export function doorSwings(room: Room): Swing[] {
  const walls = getWalls(room);
  return room.openings.filter((o) => o.type === "door").map((o) => {
    const wall = walls[o.wall];
    return { openingId: o.id, hinge: wallPoint(wall, o.offset), along: wall.dir, into: wall.inward, radius: o.width };
  });
}

/** Points along the arc the door's free edge travels, from closed to open, in room coordinates. */
export function swingArc(s: Swing, steps = 12): Vec2[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * (Math.PI / 2);
    return { x: s.hinge.x + s.radius * (Math.cos(a) * s.along.x + Math.sin(a) * s.into.x), z: s.hinge.z + s.radius * (Math.cos(a) * s.along.z + Math.sin(a) * s.into.z) };
  });
}
