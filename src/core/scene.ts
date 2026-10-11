import { getCatalogItem, typeInfo, type CatalogItem } from "./catalog";
import { normDeg, obbOf, round2, type OBB } from "./geometry";
import { normalizeCorners } from "./room";
import type { Pose, Room, Scene, SceneObject } from "./types";

export const DEFAULT_MIN_WALKWAY = 0.8;

export function createScene(room: Room, objects: SceneObject[] = [], id = randomId()): Scene {
  return {
    version: 1,
    id,
    room: { ...room, corners: normalizeCorners(room.corners) },
    objects,
    constraints: { minWalkway: DEFAULT_MIN_WALKWAY },
  };
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function cloneScene(scene: Scene): Scene {
  return structuredClone(scene);
}

export function getObject(scene: Scene, id: string): SceneObject | undefined {
  return scene.objects.find((o) => o.id === id);
}

export function nextObjectId(scene: Scene, type: string): string {
  let max = 0;
  const re = new RegExp(`^${type}_(\\d+)$`);
  for (const o of scene.objects) {
    const m = re.exec(o.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${type}_${max + 1}`;
}

export function objectFromCatalog(scene: Scene, item: CatalogItem, pose: Pose, id?: string): SceneObject {
  return {
    id: id ?? nextObjectId(scene, item.type),
    catalogId: item.id,
    type: item.type,
    name: item.name,
    w: item.w,
    d: item.d,
    h: item.h,
    x: pose.x,
    z: pose.z,
    rotation: normDeg(pose.rotation),
    color: item.color,
    seats: item.seats,
    price: item.product?.price,
    currency: item.product?.currency,
  };
}

export function objectFromCatalogId(scene: Scene, catalogId: string, pose: Pose, id?: string): SceneObject {
  const item = getCatalogItem(catalogId);
  if (!item) throw new Error(`Unknown catalog item "${catalogId}"`);
  return objectFromCatalog(scene, item, pose, id);
}

export function objectObb(o: Pick<SceneObject, "x" | "z" | "rotation" | "w" | "d">, pad = 0): OBB {
  return obbOf({ x: o.x, z: o.z, rotation: o.rotation }, o.w, o.d, pad);
}

export function withPose(o: SceneObject, pose: Pose): SceneObject {
  return { ...o, x: round2(pose.x), z: round2(pose.z), rotation: normDeg(Math.round(pose.rotation * 10) / 10) };
}

export function updateObject(scene: Scene, id: string, patch: Partial<SceneObject>): Scene {
  return { ...scene, objects: scene.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) };
}

export function isFloorLevel(o: SceneObject): boolean {
  return !!typeInfo(o.type).floorLevel;
}

export function totalSeats(scene: Scene): number {
  return scene.objects.reduce((s, o) => s + (o.seats ?? 0), 0);
}

export interface CostSummary {
  total: number;
  currency: string | null;
  pricedCount: number;
  unpricedCount: number;
}

export function costSummary(scene: Scene): CostSummary {
  let total = 0;
  let currency: string | null = null;
  let pricedCount = 0;
  let unpricedCount = 0;
  for (const o of scene.objects) {
    if (o.type === "fixture") continue;
    if (typeof o.price === "number") {
      total += o.price;
      currency = currency ?? o.currency ?? null;
      pricedCount++;
    } else {
      unpricedCount++;
    }
  }
  return { total: round2(total), currency, pricedCount, unpricedCount };
}
