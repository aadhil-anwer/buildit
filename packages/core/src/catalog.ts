import type { FurnitureType } from "./types";
import productRows from "../data/products.json";

/**
 * Where a person needs to stand to use an object.
 * front: somewhere in front of it (sofas). fullFront: all along its front,
 * so every door opens (wardrobes). notBack: any side but the back (beds,
 * desks). any: all round (chairs). none: no access check (rugs, decor).
 */
export type AccessMode = "front" | "fullFront" | "notBack" | "any" | "none";

export interface TypeInfo {
  label: string;
  group: "Seating" | "Tables" | "Storage" | "Beds" | "Decor" | "Fixed";
  access: AccessMode;
  /** Lies on the floor; furniture may stand on it and people walk over it. */
  floorLevel?: boolean;
  /** Chairs that may slide partly under a table or desk. */
  tucksUnder?: boolean;
  /** Tables and desks that chairs may tuck under. */
  hasKneeSpace?: boolean;
}

export const TYPE_INFO: Record<FurnitureType, TypeInfo> = {
  sofa: { label: "Sofa", group: "Seating", access: "front" },
  armchair: { label: "Armchair", group: "Seating", access: "front" },
  majlis_seat: { label: "Majlis seating", group: "Seating", access: "front" },
  ottoman: { label: "Ottoman", group: "Seating", access: "any" },
  bench: { label: "Bench", group: "Seating", access: "any" },
  coffee_table: { label: "Coffee table", group: "Tables", access: "none" },
  side_table: { label: "Side table", group: "Tables", access: "none" },
  tv_unit: { label: "TV unit", group: "Storage", access: "front" },
  dining_table: { label: "Dining table", group: "Tables", access: "none", hasKneeSpace: true },
  round_table: { label: "Round table", group: "Tables", access: "none", hasKneeSpace: true },
  dining_chair: { label: "Dining chair", group: "Seating", access: "any", tucksUnder: true },
  bed: { label: "Bed", group: "Beds", access: "notBack" },
  nightstand: { label: "Nightstand", group: "Beds", access: "none" },
  wardrobe: { label: "Wardrobe", group: "Storage", access: "fullFront" },
  dresser: { label: "Dresser", group: "Storage", access: "fullFront" },
  sideboard: { label: "Sideboard", group: "Storage", access: "fullFront" },
  bookshelf: { label: "Bookshelf", group: "Storage", access: "fullFront" },
  desk: { label: "Desk", group: "Tables", access: "notBack", hasKneeSpace: true },
  office_chair: { label: "Office chair", group: "Seating", access: "any", tucksUnder: true },
  rug: { label: "Rug", group: "Decor", access: "none", floorLevel: true },
  floor_lamp: { label: "Floor lamp", group: "Decor", access: "none" },
  plant: { label: "Plant", group: "Decor", access: "none" },
  fixture: { label: "Fixed item", group: "Fixed", access: "none" },
};

export interface ShopProduct {
  sku: string;
  shop: string;
  price: number;
  currency: string;
  inStock: boolean;
  url?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  type: FurnitureType;
  w: number;
  d: number;
  h: number;
  color: string;
  /** People it seats (seating only). */
  seats?: number;
  /** People it serves (tables). */
  capacity?: number;
  /** Screen diagonal in inches (TV units), for the viewing-distance rule. */
  screenInches?: number;
  /** Real product from a shop. Generic items have none. */
  product?: ShopProduct;
}

const GENERIC: CatalogItem[] = [
  // Seating
  { id: "sofa_2_seat", name: "2-seat sofa", type: "sofa", w: 1.6, d: 0.88, h: 0.85, color: "#b8ab98", seats: 2 },
  { id: "sofa_3_seat", name: "3-seat sofa", type: "sofa", w: 2.2, d: 0.9, h: 0.85, color: "#b8ab98", seats: 3 },
  { id: "sofa_4_seat", name: "4-seat sofa", type: "sofa", w: 2.7, d: 0.95, h: 0.85, color: "#8f8577", seats: 4 },
  { id: "armchair", name: "Armchair", type: "armchair", w: 0.85, d: 0.85, h: 0.85, color: "#a39380", seats: 1 },
  { id: "accent_chair", name: "Accent chair", type: "armchair", w: 0.7, d: 0.75, h: 0.8, color: "#7d8a7a", seats: 1 },
  { id: "majlis_seat_2m", name: "Majlis seating 2 m", type: "majlis_seat", w: 2.0, d: 0.8, h: 0.7, color: "#9c6b4e", seats: 3 },
  { id: "majlis_seat_3m", name: "Majlis seating 3 m", type: "majlis_seat", w: 3.0, d: 0.8, h: 0.7, color: "#9c6b4e", seats: 4 },
  { id: "majlis_corner", name: "Majlis corner", type: "majlis_seat", w: 0.8, d: 0.8, h: 0.7, color: "#9c6b4e", seats: 1 },
  { id: "ottoman", name: "Pouf / ottoman", type: "ottoman", w: 0.5, d: 0.5, h: 0.42, color: "#c9a66b", seats: 1 },
  { id: "bench", name: "Bench", type: "bench", w: 1.4, d: 0.4, h: 0.45, color: "#8b6a4f", seats: 2 },
  { id: "dining_chair", name: "Dining chair", type: "dining_chair", w: 0.46, d: 0.52, h: 0.9, color: "#8b6a4f", seats: 1 },
  { id: "office_chair", name: "Office chair", type: "office_chair", w: 0.6, d: 0.6, h: 1.0, color: "#3d3d3d", seats: 1 },
  // Tables
  { id: "coffee_table_rect", name: "Coffee table 120", type: "coffee_table", w: 1.2, d: 0.6, h: 0.42, color: "#7a5a43" },
  { id: "coffee_table_small", name: "Coffee table 90", type: "coffee_table", w: 0.9, d: 0.5, h: 0.42, color: "#7a5a43" },
  { id: "coffee_table_round", name: "Round coffee table", type: "coffee_table", w: 0.8, d: 0.8, h: 0.42, color: "#7a5a43" },
  { id: "side_table", name: "Side table", type: "side_table", w: 0.5, d: 0.5, h: 0.55, color: "#7a5a43" },
  { id: "dining_table_4", name: "Dining table (4)", type: "dining_table", w: 1.2, d: 0.8, h: 0.75, color: "#8b6a4f", capacity: 4 },
  { id: "dining_table_6", name: "Dining table (6)", type: "dining_table", w: 1.8, d: 0.9, h: 0.75, color: "#8b6a4f", capacity: 6 },
  { id: "dining_table_8", name: "Dining table (8)", type: "dining_table", w: 2.4, d: 1.0, h: 0.75, color: "#8b6a4f", capacity: 8 },
  { id: "dining_table_10", name: "Dining table (10)", type: "dining_table", w: 3.0, d: 1.1, h: 0.75, color: "#8b6a4f", capacity: 10 },
  { id: "round_table_4", name: "Round dining table (4)", type: "round_table", w: 1.1, d: 1.1, h: 0.75, color: "#8b6a4f", capacity: 4 },
  { id: "desk", name: "Desk", type: "desk", w: 1.2, d: 0.6, h: 0.75, color: "#d9d2c5" },
  // Storage
  { id: "tv_unit", name: "TV unit with 55\" TV", type: "tv_unit", w: 1.8, d: 0.45, h: 0.5, color: "#5b4636", screenInches: 55 },
  { id: "tv_unit_large", name: "TV unit with 65\" TV", type: "tv_unit", w: 2.2, d: 0.45, h: 0.5, color: "#5b4636", screenInches: 65 },
  { id: "sideboard", name: "Sideboard", type: "sideboard", w: 1.6, d: 0.45, h: 0.8, color: "#6b5444" },
  { id: "bookshelf", name: "Bookshelf", type: "bookshelf", w: 0.9, d: 0.35, h: 1.9, color: "#cbbfae" },
  { id: "dresser", name: "Dresser", type: "dresser", w: 1.2, d: 0.5, h: 0.8, color: "#cbbfae" },
  { id: "wardrobe_2", name: "Wardrobe 2-door", type: "wardrobe", w: 1.0, d: 0.6, h: 2.1, color: "#e6e0d6" },
  { id: "wardrobe_3", name: "Wardrobe 3-door", type: "wardrobe", w: 1.5, d: 0.6, h: 2.1, color: "#e6e0d6" },
  { id: "wardrobe_4", name: "Wardrobe 4-door", type: "wardrobe", w: 2.0, d: 0.6, h: 2.2, color: "#e6e0d6" },
  // Beds
  { id: "bed_single", name: "Single bed 90", type: "bed", w: 1.0, d: 2.1, h: 1.0, color: "#d8cfc2", seats: 0 },
  { id: "bed_double", name: "Double bed 140", type: "bed", w: 1.5, d: 2.1, h: 1.0, color: "#d8cfc2", seats: 0 },
  { id: "bed_queen", name: "Queen bed 160", type: "bed", w: 1.7, d: 2.15, h: 1.1, color: "#d8cfc2", seats: 0 },
  { id: "bed_king", name: "King bed 180", type: "bed", w: 1.95, d: 2.15, h: 1.1, color: "#d8cfc2", seats: 0 },
  { id: "nightstand", name: "Nightstand", type: "nightstand", w: 0.5, d: 0.4, h: 0.55, color: "#cbbfae" },
  // Decor
  { id: "rug_bedroom", name: "Rug 150×220", type: "rug", w: 2.2, d: 1.5, h: 0.01, color: "#d6c7ae" },
  { id: "rug_small", name: "Rug 160×230", type: "rug", w: 2.3, d: 1.6, h: 0.01, color: "#d6c7ae" },
  { id: "rug_medium", name: "Rug 200×300", type: "rug", w: 3.0, d: 2.0, h: 0.01, color: "#d6c7ae" },
  { id: "rug_large", name: "Rug 250×350", type: "rug", w: 3.5, d: 2.5, h: 0.01, color: "#c8b79a" },
  { id: "rug_round", name: "Round rug 200", type: "rug", w: 2.0, d: 2.0, h: 0.01, color: "#d6c7ae" },
  { id: "floor_lamp", name: "Floor lamp", type: "floor_lamp", w: 0.4, d: 0.4, h: 1.6, color: "#2f2f2f" },
  { id: "plant", name: "Plant", type: "plant", w: 0.5, d: 0.5, h: 1.2, color: "#4f7a4a" },
];

/** Shape of a row in data/products.json (written by scripts/import-products.ts). */
export interface ProductRow {
  sku: string;
  name: string;
  shop: string;
  type: FurnitureType;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  price: number;
  currency: string;
  color: string;
  seats?: number;
  in_stock: boolean;
  url?: string;
}

export function productToCatalogItem(p: ProductRow): CatalogItem {
  return {
    id: `p_${p.sku}`,
    name: p.name,
    type: p.type,
    w: p.width_cm / 100,
    d: p.depth_cm / 100,
    h: p.height_cm / 100,
    color: p.color,
    seats: p.seats,
    product: { sku: p.sku, shop: p.shop, price: p.price, currency: p.currency, inStock: p.in_stock, url: p.url },
  };
}

const PRODUCTS: CatalogItem[] = (productRows as ProductRow[]).map(productToCatalogItem);

export const CATALOG: CatalogItem[] = [...GENERIC, ...PRODUCTS];

const BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

export function getCatalogItem(id: string): CatalogItem | undefined {
  return BY_ID.get(id);
}

export function hasProducts(): boolean {
  return PRODUCTS.length > 0;
}

export function typeInfo(type: FurnitureType): TypeInfo {
  return TYPE_INFO[type] ?? TYPE_INFO.fixture;
}
