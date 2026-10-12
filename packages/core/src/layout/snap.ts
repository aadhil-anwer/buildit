import { dot, obbCorners } from "../geometry";
import { getWalls } from "../room";
import { objectObb } from "../scene";
import type { Pose, Room, SceneObject } from "../types";

/** How close to a wall (metres) a dragged piece has to come before it jumps flush against it. */
export const SNAP_DISTANCE = 0.08;

/**
 * Pulls a pose against any wall its edge is within `SNAP_DISTANCE` of (up to two, for a corner). Only ever moves a piece
 * towards a wall it is already almost touching, along that wall's normal; a piece that is not near one is returned as given.
 */
export function snapToWalls(room: Room, piece: Pick<SceneObject, "w" | "d">, pose: Pose): Pose {
  let snapped = pose;
  for (const wall of getWalls(room)) {
    const corners = obbCorners(objectObb({ ...piece, ...snapped }));
    const gap = Math.min(...corners.map((c) => dot({ x: c.x - wall.start.x, z: c.z - wall.start.z }, wall.inward)));
    if (gap > 0.001 && gap <= SNAP_DISTANCE) snapped = { ...snapped, x: snapped.x - wall.inward.x * gap, z: snapped.z - wall.inward.z * gap };
  }
  return snapped;
}
