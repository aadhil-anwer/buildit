"use client";

import { getCatalogItem } from "@/core/catalog";
import { normDeg } from "@/core/geometry";
import { addObject, moveObject, removeObject, resizeObject, setColor, setLocked } from "@/core/ops";
import { getObject } from "@/core/scene";
import { wallRelation } from "@/core/summary";
import type { Room, Scene } from "@/core/types";
import { useEditor } from "./store";

/**
 * Manual edits. They go through the same scene operations as the AI, but
 * manual moves are permissive: the user may put something in a bad spot
 * (it turns red) - the editor never blocks a hand edit.
 */

function st() {
  return useEditor.getState();
}

export function addFromCatalog(catalogId: string) {
  const s = st();
  const item = getCatalogItem(catalogId);
  const res = addObject(s.scene, catalogId);
  if (!res.ok) {
    s.showToast(res.message);
    return;
  }
  s.commit(res.scene, `Added ${item?.name ?? catalogId}`);
  s.select(res.changed[0] ?? null);
  s.flashIds(res.changed);
}

export function rotateSelected(deg: number) {
  const s = st();
  const o = s.selectedId ? getObject(s.scene, s.selectedId) : undefined;
  if (!o) return;
  if (o.locked) return s.showToast(`${o.name} is locked`);
  const scene: Scene = {
    ...s.scene,
    objects: s.scene.objects.map((x) => (x.id === o.id ? { ...x, rotation: normDeg(x.rotation + deg) } : x)),
  };
  s.commit(scene, `Rotated ${o.name}`);
}

export function deleteSelected() {
  const s = st();
  const o = s.selectedId ? getObject(s.scene, s.selectedId) : undefined;
  if (!o) return;
  const res = removeObject(s.scene, o.id);
  if (!res.ok) return s.showToast(`${o.name} is locked. Unlock it to delete.`);
  s.commit(res.scene, `Removed ${o.name}`);
  s.select(null);
}

export function snapSelectedToWall() {
  const s = st();
  const o = s.selectedId ? getObject(s.scene, s.selectedId) : undefined;
  if (!o) return;
  const rel = wallRelation(s.scene, o);
  if (!rel) return;
  const res = moveObject(s.scene, o.id, { type: "against_wall", wall: rel.wall, align_with: o.id });
  if (!res.ok) return s.showToast(res.message);
  s.commit(res.scene, `Put ${o.name} against the ${rel.wall} wall`);
  s.flashIds(res.changed);
}

export function resizeSelected(size: { w?: number; d?: number; h?: number }) {
  const s = st();
  const o = s.selectedId ? getObject(s.scene, s.selectedId) : undefined;
  if (!o) return;
  const res = resizeObject(s.scene, o.id, size);
  s.commit(res.scene, `Resized ${o.name}`);
}

export function colorSelected(color: string) {
  const s = st();
  const o = s.selectedId ? getObject(s.scene, s.selectedId) : undefined;
  if (!o || o.color === color) return;
  s.commit(setColor(s.scene, [o.id], color).scene, `Recoloured ${o.name}`);
}

export function toggleLockSelected() {
  const s = st();
  const o = s.selectedId ? getObject(s.scene, s.selectedId) : undefined;
  if (!o) return;
  s.commit(setLocked(s.scene, o.id, !o.locked).scene, `${o.locked ? "Unlocked" : "Locked"} ${o.name}`);
}

export function updateRoom(patch: Partial<Room>, label: string) {
  const s = st();
  s.commit({ ...s.scene, room: { ...s.scene.room, ...patch } }, label);
}

export function setMinWalkway(m: number) {
  const s = st();
  s.commit({ ...s.scene, constraints: { ...s.scene.constraints, minWalkway: m } }, `Minimum walkway ${Math.round(m * 100)} cm`);
}
