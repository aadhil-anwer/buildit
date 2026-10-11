import { typeInfo } from "../catalog";
import { obbInsidePolygon, obbOverlap, round2 } from "../geometry";
import { getWalls, openingZone } from "../room";
import { getObject, objectObb } from "../scene";
import type { Pose, Scene, SceneObject } from "../types";

export type IssueKind =
  | "collision"
  | "outside_room"
  | "blocks_door"
  | "blocks_window"
  | "no_access"
  | "narrow_access";

export interface Issue {
  kind: IssueKind;
  severity: "error" | "warning";
  objectIds: string[];
  openingId?: string;
  /** Measured value in metres where relevant (e.g. access width). */
  value?: number;
  message: string;
}

/** Overlap below this is treated as touching, not colliding. */
const TOUCH_TOLERANCE = 0.01;
/** How far a chair may slide under a table or desk. */
const TUCK_ALLOWANCE = 0.25;

function allowedOverlap(a: SceneObject, b: SceneObject): number {
  const ia = typeInfo(a.type);
  const ib = typeInfo(b.type);
  if (ia.floorLevel || ib.floorLevel) return Infinity;
  if ((ia.tucksUnder && ib.hasKneeSpace) || (ib.tucksUnder && ia.hasKneeSpace)) return TUCK_ALLOWANCE;
  return TOUCH_TOLERANCE;
}

export interface PoseCheck {
  ok: boolean;
  /** Hard problems that make the pose invalid. */
  reasons: string[];
  /** Soft problems (window partly covered). */
  warnings: string[];
  /** Objects this pose collides with. */
  collidesWith: string[];
}

/**
 * Check one object at a candidate pose against the room and everything
 * else. `ignore` lists object ids to leave out (e.g. objects being moved
 * together).
 */
export function checkPose(scene: Scene, obj: SceneObject, pose: Pose, ignore: Set<string> = new Set()): PoseCheck {
  const candidate = { ...obj, ...pose };
  const box = objectObb(candidate);
  const reasons: string[] = [];
  const warnings: string[] = [];
  const collidesWith: string[] = [];
  const info = typeInfo(obj.type);

  if (!obbInsidePolygon(box, scene.room.corners)) {
    reasons.push("does not fit inside the room there");
  }

  for (const other of scene.objects) {
    if (other.id === obj.id || ignore.has(other.id)) continue;
    const pen = obbOverlap(box, objectObb(other));
    if (pen > allowedOverlap(candidate, other)) {
      collidesWith.push(other.id);
    }
  }
  if (collidesWith.length) reasons.push(`would overlap ${collidesWith.join(", ")}`);

  if (!info.floorLevel) {
    for (const o of scene.room.openings) {
      const zone = openingZone(scene.room, o);
      const pen = obbOverlap(box, zone);
      if (pen <= TOUCH_TOLERANCE) continue;
      if (o.type === "window") {
        if (obj.h > o.sill + 0.05) warnings.push(`covers ${o.id}`);
      } else {
        reasons.push(`blocks ${o.id}`);
      }
    }
  }

  return { ok: reasons.length === 0, reasons, warnings, collidesWith };
}

/** All geometric issues in a scene (walkway issues come from clearance.ts). */
export function findGeometryIssues(scene: Scene): Issue[] {
  const issues: Issue[] = [];
  const objs = scene.objects;
  const boxes = objs.map((o) => objectObb(o));

  objs.forEach((o, i) => {
    if (!obbInsidePolygon(boxes[i], scene.room.corners)) {
      issues.push({
        kind: "outside_room",
        severity: "error",
        objectIds: [o.id],
        message: `${o.name} (${o.id}) goes through a wall`,
      });
    }
  });

  for (let i = 0; i < objs.length; i++) {
    for (let j = i + 1; j < objs.length; j++) {
      const pen = obbOverlap(boxes[i], boxes[j]);
      if (pen > allowedOverlap(objs[i], objs[j])) {
        issues.push({
          kind: "collision",
          severity: "error",
          objectIds: [objs[i].id, objs[j].id],
          value: round2(pen),
          message: `${objs[i].id} and ${objs[j].id} overlap by ${Math.round(pen * 100)} cm`,
        });
      }
    }
  }

  const walls = getWalls(scene.room);
  for (const op of scene.room.openings) {
    const zone = openingZone(scene.room, op);
    const wallId = walls[op.wall]?.id ?? `wall ${op.wall}`;
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      if (typeInfo(o.type).floorLevel) continue;
      if (obbOverlap(boxes[i], zone) <= TOUCH_TOLERANCE) continue;
      if (op.type === "window") {
        if (o.h > op.sill + 0.05) {
          issues.push({
            kind: "blocks_window",
            severity: "warning",
            objectIds: [o.id],
            openingId: op.id,
            message: `${o.id} (${Math.round(o.h * 100)} cm tall) stands in front of ${op.id} on the ${wallId} wall`,
          });
        }
      } else {
        issues.push({
          kind: "blocks_door",
          severity: "error",
          objectIds: [o.id],
          openingId: op.id,
          message: `${o.id} is in the swing/approach area of ${op.id} on the ${wallId} wall`,
        });
      }
    }
  }
  return issues;
}

/** Does moving `id` to `pose` keep the scene free of new hard problems? */
export function isPoseValid(scene: Scene, id: string, pose: Pose, ignore?: Set<string>): boolean {
  const obj = getObject(scene, id);
  return !!obj && checkPose(scene, obj, pose, ignore).ok;
}
