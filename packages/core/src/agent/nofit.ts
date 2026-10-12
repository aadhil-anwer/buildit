import { CATALOG, getCatalogItem, typeInfo, type CatalogItem } from "../catalog";
import { fits, largestFree } from "../layout/free-space";
import type { FurnitureType, Scene } from "../types";

/** Room a piece needs around it, on top of its own footprint: chairs pulled out from a dining table (75 cm each side, the engine's rule). */
const PULL_OUT = 0.75;
const needs = (item: CatalogItem) => {
  const clear = item.type === "dining_table" || item.type === "round_table" ? 2 * PULL_OUT : 0;
  return { w: item.w + clear, d: item.d + clear };
};

export interface NoFit {
  catalogId: string;
  type: FurnitureType;
  /** Clear floor it needs, metres. */
  need: { w: number; d: number };
  /** The biggest clear rectangle in the room now. */
  largest: { w: number; d: number };
  /** The biggest clear rectangle if one movable piece were taken out, and which piece. Absent when no piece would help. */
  without?: { w: number; d: number; type: FurnitureType };
  /** A smaller piece of the same kind that does fit, if there is one. */
  alternative?: { catalogId: string; type: FurnitureType; w: number; d: number };
}

const round = (m: number) => Math.round(m * 10) / 10;
const area = (r: { w: number; d: number }) => r.w * r.d;
const MAX_TRIED = 12;

/**
 * Why a piece the person asked for did not fit, measured: how much clear floor it needs, how much there is, what
 * taking away one movable piece would give, and the closest piece of the same kind that does fit. Null when it
 * does fit by this measure (so the refusal was for another reason).
 */
export function findNoFit(scene: Scene, catalogId: string): NoFit | null {
  const item = getCatalogItem(catalogId);
  if (!item) return null;
  const need = needs(item);
  const largest = largestFree(scene);
  if (fits(largest, need.w, need.d)) return null;

  const movable = scene.objects.filter((o) => !o.locked && !typeInfo(o.type).floorLevel).slice(0, MAX_TRIED);
  const freed = movable.map((o) => ({ o, free: largestFree(scene, { without: [o.id] }) })).sort((a, b) => area(b.free) - area(a.free))[0];
  const alt = CATALOG.filter((c) => c.type === item.type && c.id !== item.id && !c.product)
    .filter((c) => fits(largest, needs(c).w, needs(c).d))
    .sort((a, b) => area(b) - area(a))[0];

  return {
    catalogId,
    type: item.type,
    need: { w: round(need.w), d: round(need.d) },
    largest: { w: round(largest.w), d: round(largest.d) },
    ...(freed && area(freed.free) > area(largest) ? { without: { w: round(freed.free.w), d: round(freed.free.d), type: freed.o.type } } : {}),
    ...(alt ? { alternative: { catalogId: alt.id, type: alt.type, w: alt.w, d: alt.d } } : {}),
  };
}
