/**
 * Scene operations shared by the editor UI and the AI agent. Every op is a
 * pure function: it takes a scene and returns a new one plus a short,
 * factual message saying what happened (or why nothing did).
 */
import { getCatalogItem } from "./catalog";
import { COMPASS_DIR, add, angleDiff, frontDir, normDeg, rotationFacing, scale, sub } from "./geometry";
import { improveLayout, type ImproveOptions } from "./layout/improve";
import { arrangeAround, placeAnywhere, placeNearPoint, resolvePlacement, resolveTarget, type Facing, type Placement } from "./layout/placement";
import { checkPose } from "./layout/validate";
import { roomCenter } from "./room";
import { getObject, objectFromCatalog, withPose } from "./scene";
import { describePosition, wallRelation } from "./summary";
import type { Pose, Scene, SceneObject } from "./types";

export interface OpResult {
  scene: Scene;
  ok: boolean;
  message: string;
  /** Ids of objects that changed (for highlighting and labels). */
  changed: string[];
}

const fail = (scene: Scene, message: string): OpResult => ({ scene, ok: false, message, changed: [] });

function setPose(scene: Scene, id: string, pose: Pose): Scene {
  return { ...scene, objects: scene.objects.map((o) => (o.id === id ? withPose(o, pose) : o)) };
}

function lockedError(o: SceneObject) {
  return `${o.id} is locked (the user asked to keep it where it is). Unlock it first only if the user explicitly wants it moved.`;
}

export function moveObject(scene: Scene, id: string, placement: Placement): OpResult {
  const obj = getObject(scene, id);
  if (!obj) return fail(scene, `No object with id "${id}"`);
  if (obj.locked) return fail(scene, lockedError(obj));
  const res = resolvePlacement(scene, obj, placement);
  if (!res.ok) return fail(scene, `Could not move ${id}: ${res.reason}`);
  const next = setPose(scene, id, res.pose);
  const moved = getObject(next, id)!;
  const notes = res.notes.length ? ` Note: ${res.notes.join("; ")}.` : "";
  return { scene: next, ok: true, message: `Moved ${id}: ${describePosition(next, moved)}.${notes}`, changed: [id] };
}

export interface LayoutStep {
  object_id: string;
  placement: Placement;
}

/**
 * Move several objects as one rearrangement. All listed objects are lifted
 * first, then placed in order, so earlier pieces aren't blocked by where
 * later pieces used to be. List anchor pieces (sofa, bed, table) first.
 */
export function applyLayout(scene: Scene, steps: LayoutStep[]): OpResult {
  const ids = steps.map((s) => s.object_id);
  for (const id of ids) {
    const o = getObject(scene, id);
    if (!o) return fail(scene, `No object with id "${id}"`);
    if (o.locked) return fail(scene, lockedError(o));
  }
  const pending = new Set(ids);
  let working = scene;
  const lines: string[] = [];
  const failed: string[] = [];
  const changed: string[] = [];
  for (const step of steps) {
    const obj = getObject(working, step.object_id)!;
    const target = "target" in step.placement ? step.placement.target : "align_with" in step.placement ? step.placement.align_with : undefined;
    if (target && pending.has(target) && target !== step.object_id) {
      failed.push(`${step.object_id}: its target ${target} is placed later in this layout; list ${target} first`);
      pending.delete(step.object_id);
      continue;
    }
    pending.delete(step.object_id);
    const res = resolvePlacement(working, obj, step.placement, { ignore: pending });
    if (res.ok) {
      working = setPose(working, obj.id, res.pose);
      changed.push(obj.id);
      lines.push(`${obj.id}: ${describePosition(working, getObject(working, obj.id)!)}${res.notes.length ? ` (${res.notes.join("; ")})` : ""}`);
    } else {
      failed.push(`${obj.id}: ${res.reason}`);
    }
  }
  // Anything that failed must still end up somewhere valid.
  for (const f of failed) {
    const id = f.split(":")[0];
    const obj = getObject(working, id)!;
    if (checkPose(working, obj, obj).ok) {
      lines.push(`${id}: left where it was`);
      continue;
    }
    const res = placeNearPoint(working, obj, obj);
    if (res.ok) {
      working = setPose(working, id, res.pose);
      changed.push(id);
      lines.push(`${id}: moved to the nearest free spot, ${describePosition(working, getObject(working, id)!)}`);
    }
  }
  const ok = failed.length === 0;
  const message = [
    lines.length ? `Placed:\n- ${lines.join("\n- ")}` : "Nothing was placed.",
    failed.length ? `Failed:\n- ${failed.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { scene: working, ok: ok || changed.length > 0, message, changed };
}

export function rotateObject(
  scene: Scene,
  id: string,
  spec: { by_degrees?: number; facing?: Facing; target?: string },
): OpResult {
  const obj = getObject(scene, id);
  if (!obj) return fail(scene, `No object with id "${id}"`);
  if (obj.locked) return fail(scene, lockedError(obj));
  let rotation = obj.rotation;
  if (typeof spec.by_degrees === "number") {
    rotation = normDeg(obj.rotation + spec.by_degrees);
  } else if (spec.facing) {
    const f = spec.facing;
    if (f === "north" || f === "south" || f === "east" || f === "west") rotation = rotationFacing(COMPASS_DIR[f]);
    else if (f === "toward_target" || f === "away_from_target") {
      const t = spec.target ? resolveTarget(scene, spec.target) : undefined;
      if (!t) return fail(scene, "facing toward/away from a target needs a valid target");
      rotation = rotationFacing(sub(t.point, obj)) + (f === "away_from_target" ? 180 : 0);
      const right = Math.round(rotation / 90) * 90;
      rotation = angleDiff(rotation, right) <= 20 ? right : Math.round(rotation / 15) * 15;
    } else if (f === "same_as_target") {
      const t = spec.target ? getObject(scene, spec.target) : undefined;
      if (!t) return fail(scene, "same_as_target needs a target object");
      rotation = t.rotation;
    } else if (f === "into_room") {
      rotation = Math.round(rotationFacing(sub(roomCenter(scene.room), obj)) / 90) * 90;
    } else if (f === "keep") {
      rotation = obj.rotation;
    } else if (f === "along_wall") {
      rotation = obj.rotation + 90;
    }
  } else {
    return fail(scene, "rotate needs by_degrees or facing");
  }
  rotation = normDeg(rotation);
  // Rotate in place if possible, otherwise find the nearest spot it fits.
  const inPlace = { x: obj.x, z: obj.z, rotation };
  let pose: Pose | null = checkPose(scene, obj, inPlace).ok ? inPlace : null;
  if (!pose) {
    const turned = { ...obj, rotation };
    let best: Pose | null = null;
    let bestD = Infinity;
    for (let dx = -0.8; dx <= 0.8 + 1e-6; dx += 0.05) {
      for (let dz = -0.8; dz <= 0.8 + 1e-6; dz += 0.05) {
        const d = Math.hypot(dx, dz);
        if (d >= bestD) continue;
        const p = { x: obj.x + dx, z: obj.z + dz, rotation };
        if (checkPose(scene, turned, p).ok) {
          best = p;
          bestD = d;
        }
      }
    }
    pose = best;
  }
  if (!pose) return fail(scene, `Could not rotate ${id}: it doesn't fit facing that way near its current spot`);
  const next = setPose(scene, id, pose);
  const shifted = Math.hypot(pose.x - obj.x, pose.z - obj.z);
  const note = shifted > 0.01 ? ` (shifted ${Math.round(shifted * 100)} cm so it fits)` : "";
  return { scene: next, ok: true, message: `Rotated ${id}: ${describePosition(next, getObject(next, id)!)}${note}.`, changed: [id] };
}

export function addObject(scene: Scene, catalogId: string, placement?: Placement, color?: string): OpResult {
  const item = getCatalogItem(catalogId);
  if (!item) return fail(scene, `Unknown catalog item "${catalogId}"`);
  const center = roomCenter(scene.room);
  const obj = objectFromCatalog(scene, item, { x: center.x, z: center.z, rotation: 0 });
  if (color) obj.color = color;
  // Place against an empty scene entry so the new object isn't checked against itself.
  // Without a placement, take the free spot that keeps everything
  // (including the new piece) reachable, preferring central ones.
  const res = placement ? resolvePlacement(scene, obj, placement) : placeAnywhere(scene, obj);
  if (!res.ok) return fail(scene, `Could not add ${item.name}: ${res.reason}`);
  const placed = withPose(obj, res.pose);
  const next = { ...scene, objects: [...scene.objects, placed] };
  const notes = res.notes.length ? ` Note: ${res.notes.join("; ")}.` : "";
  return { scene: next, ok: true, message: `Added ${placed.id} (${item.name}): ${describePosition(next, placed)}.${notes}`, changed: [placed.id] };
}

export function removeObject(scene: Scene, id: string): OpResult {
  const obj = getObject(scene, id);
  if (!obj) return fail(scene, `No object with id "${id}"`);
  if (obj.locked) return fail(scene, lockedError(obj));
  return { scene: { ...scene, objects: scene.objects.filter((o) => o.id !== id) }, ok: true, message: `Removed ${id}.`, changed: [] };
}

/** Swap an object for another catalog item, keeping its spot and facing. */
export function replaceObject(scene: Scene, id: string, catalogId: string): OpResult {
  const obj = getObject(scene, id);
  if (!obj) return fail(scene, `No object with id "${id}"`);
  if (obj.locked) return fail(scene, lockedError(obj));
  const item = getCatalogItem(catalogId);
  if (!item) return fail(scene, `Unknown catalog item "${catalogId}"`);
  const without = { ...scene, objects: scene.objects.filter((o) => o.id !== id) };
  const newId = item.type === obj.type ? obj.id : undefined;
  const fresh = objectFromCatalog(without, item, obj, newId);
  // Keep the back on the wall if it was against one.
  const rel = wallRelation(scene, obj);
  let pose: Pose = { x: obj.x, z: obj.z, rotation: obj.rotation };
  if (rel && rel.backToWall && rel.gap <= 0.08) {
    const p = add(obj, scale(frontDir(obj.rotation), (fresh.d - obj.d) / 2));
    pose = { x: p.x, z: p.z, rotation: obj.rotation };
  }
  let res = checkPose(without, fresh, pose).ok ? { ok: true as const, pose, notes: [] as string[] } : placeNearPoint(without, fresh, pose);
  if (!res.ok) res = placeNearPoint(without, fresh, roomCenter(scene.room));
  if (!res.ok) return fail(scene, `Could not fit ${item.name} in place of ${id}: ${res.reason}`);
  const placed = withPose(fresh, res.pose);
  const next = { ...without, objects: [...without.objects, placed] };
  return {
    scene: next,
    ok: true,
    message: `Replaced ${id} with ${placed.id} (${item.name}, ${item.w}×${item.d} m): ${describePosition(next, placed)}.`,
    changed: [placed.id],
  };
}

export function resizeObject(scene: Scene, id: string, size: { w?: number; d?: number; h?: number }): OpResult {
  const obj = getObject(scene, id);
  if (!obj) return fail(scene, `No object with id "${id}"`);
  const resized = { ...obj, w: size.w ?? obj.w, d: size.d ?? obj.d, h: size.h ?? obj.h };
  const next = { ...scene, objects: scene.objects.map((o) => (o.id === id ? resized : o)) };
  const chk = checkPose(next, resized, resized);
  const note = chk.ok ? "" : ` Warning: at this size it ${chk.reasons.join("; ")}.`;
  return { scene: next, ok: true, message: `Resized ${id} to ${resized.w}×${resized.d}×${resized.h} m.${note}`, changed: [id] };
}

export function setColor(scene: Scene, ids: string[], color: string): OpResult {
  const missing = ids.filter((id) => !getObject(scene, id));
  if (missing.length) return fail(scene, `No objects with ids: ${missing.join(", ")}`);
  const set = new Set(ids);
  return {
    scene: { ...scene, objects: scene.objects.map((o) => (set.has(o.id) ? { ...o, color } : o)) },
    ok: true,
    message: `Changed colour of ${ids.join(", ")} to ${color}.`,
    changed: ids,
  };
}

export function setLocked(scene: Scene, id: string, locked: boolean): OpResult {
  const obj = getObject(scene, id);
  if (!obj) return fail(scene, `No object with id "${id}"`);
  return {
    scene: { ...scene, objects: scene.objects.map((o) => (o.id === id ? { ...o, locked } : o)) },
    ok: true,
    message: `${locked ? "Locked" : "Unlocked"} ${id}.`,
    changed: [id],
  };
}

export function setFinish(scene: Scene, finish: { floor_color?: string; wall_color?: string }): OpResult {
  return {
    scene: {
      ...scene,
      room: {
        ...scene.room,
        floorColor: finish.floor_color ?? scene.room.floorColor,
        wallColor: finish.wall_color ?? scene.room.wallColor,
      },
    },
    ok: true,
    message: `Updated room finish${finish.floor_color ? ` floor ${finish.floor_color}` : ""}${finish.wall_color ? ` walls ${finish.wall_color}` : ""}.`,
    changed: [],
  };
}

export function setMinWalkway(scene: Scene, metres: number): OpResult {
  const v = Math.min(1.5, Math.max(0.5, metres));
  return {
    scene: { ...scene, constraints: { ...scene.constraints, minWalkway: v } },
    ok: true,
    message: `Minimum walkway set to ${Math.round(v * 100)} cm.`,
    changed: [],
  };
}

export function arrangeObjectsAround(
  scene: Scene,
  centerId: string,
  objectIds: string[],
  add?: { catalog_id: string; count: number },
  gap?: number,
): OpResult {
  const center = getObject(scene, centerId);
  if (!center) return fail(scene, `No object with id "${centerId}"`);
  let working = scene;
  const ids = [...objectIds];
  for (const id of ids) {
    const o = getObject(working, id);
    if (!o) return fail(scene, `No object with id "${id}"`);
    if (o.locked) return fail(scene, lockedError(o));
  }
  if (add && add.count > 0) {
    const item = getCatalogItem(add.catalog_id);
    if (!item) return fail(scene, `Unknown catalog item "${add.catalog_id}"`);
    for (let i = 0; i < Math.min(add.count, 16); i++) {
      const o = objectFromCatalog(working, item, { x: center.x, z: center.z, rotation: 0 });
      working = { ...working, objects: [...working.objects, o] };
      ids.push(o.id);
    }
  }
  if (!ids.length) return fail(scene, "Nothing to arrange");
  const res = arrangeAround(working, centerId, ids, gap);
  if (typeof res === "string") return fail(scene, res);
  for (const [id, pose] of res.poses) working = setPose(working, id, pose);
  // Newly added objects that found no seat are dropped; existing ones stay.
  const added = new Set(ids.filter((id) => !objectIds.includes(id)));
  const droppedNew = res.failed.filter((f) => added.has(f.id)).map((f) => f.id);
  if (droppedNew.length) working = { ...working, objects: working.objects.filter((o) => !droppedNew.includes(o.id)) };
  const keptFailures = res.failed.filter((f) => !added.has(f.id));
  for (const f of keptFailures) {
    const obj = getObject(working, f.id)!;
    if (!checkPose(working, obj, obj).ok) {
      const p = placeNearPoint(working, obj, obj);
      if (p.ok) working = setPose(working, f.id, p.pose);
    }
  }
  const placed = [...res.poses.keys()];
  const parts = [`Arranged ${placed.length} around ${centerId}: ${placed.join(", ")}.`];
  if (droppedNew.length) parts.push(`${droppedNew.length} new item(s) did not fit and were not added.`);
  if (keptFailures.length) parts.push(`Could not seat: ${keptFailures.map((f) => `${f.id} (${f.reason})`).join(", ")}.`);
  return { scene: working, ok: placed.length > 0, message: parts.join(" "), changed: placed };
}

export function improve(scene: Scene, opts: ImproveOptions): OpResult {
  const res = improveLayout(scene, opts);
  if (!res.moved.length) {
    return {
      scene,
      ok: false,
      message:
        res.before.hardProblems === 0 && (res.before.tightestAccess ?? 9) >= (opts.targetWalkway ?? scene.constraints.minWalkway) - 0.02
          ? "Layout already meets the walkway target; nothing to improve by small moves."
          : "Small moves could not improve this layout. A bigger change is needed (move or replace a large piece, or remove something).",
      changed: [],
    };
  }
  const fmt = (v: number | null) => (v === null ? "n/a" : `${Math.round(v * 100)} cm`);
  const movedText = res.moved
    .map((m) => `${m.id} ${m.distance > 0 ? `moved ${Math.round(m.distance * 100)} cm` : ""}${m.rotated ? `${m.distance > 0 ? " and " : ""}turned` : ""}`)
    .join(", ");
  return {
    scene: res.scene,
    ok: true,
    message: `Adjusted ${movedText}. Hard problems ${res.before.hardProblems} -> ${res.after.hardProblems}. Tightest access ${fmt(res.before.tightestAccess)} -> ${fmt(res.after.tightestAccess)}.`,
    changed: res.moved.map((m) => m.id),
  };
}
