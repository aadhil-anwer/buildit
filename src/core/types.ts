/**
 * Scene model shared by every surface (web editor, AI agent, future iOS
 * capture). Plain JSON: the renderer only draws it, the layout engine only
 * reads and writes it.
 *
 * Conventions
 * - Units: metres and degrees.
 * - Floor plane is X/Z, Y is up. Seen from above with north at the top:
 *   +X is east, +Z is south.
 * - The room outline is a simple polygon listed clockwise in that top-down
 *   view. Wall i runs from corner i to corner i+1. An opening's `offset` is
 *   measured from the wall's start corner, which is the left end when you
 *   stand inside the room facing that wall.
 * - An object's `x`/`z` is the centre of its footprint. At rotation 0 its
 *   front faces south (+Z); rotation turns it counter-clockwise seen from
 *   above, so 90 faces east, 180 north, 270 west.
 */

export type Vec2 = { x: number; z: number };

export type Compass = "north" | "south" | "east" | "west";

export type OpeningType = "door" | "window" | "opening";

export interface Opening {
  id: string;
  type: OpeningType;
  /** Index into the room's wall list (wall i = corners[i] -> corners[i+1]). */
  wall: number;
  /** Distance from the wall's start corner to the near edge of the opening. */
  offset: number;
  width: number;
  height: number;
  /** Height of the bottom edge above the floor (windows). */
  sill: number;
}

export interface Room {
  name: string;
  /** Floor outline, clockwise seen from above (north up). */
  corners: Vec2[];
  height: number;
  openings: Opening[];
  floorColor: string;
  wallColor: string;
}

export type FurnitureType =
  | "sofa"
  | "armchair"
  | "majlis_seat"
  | "ottoman"
  | "bench"
  | "coffee_table"
  | "side_table"
  | "tv_unit"
  | "dining_table"
  | "round_table"
  | "dining_chair"
  | "bed"
  | "nightstand"
  | "wardrobe"
  | "dresser"
  | "sideboard"
  | "bookshelf"
  | "desk"
  | "office_chair"
  | "rug"
  | "floor_lamp"
  | "plant"
  | "fixture";

export interface SceneObject {
  id: string;
  /** Catalog entry this was created from (generic item or shop product). */
  catalogId: string;
  type: FurnitureType;
  name: string;
  /** Footprint width (side to side), depth (front to back), height. */
  w: number;
  d: number;
  h: number;
  x: number;
  z: number;
  rotation: number;
  color: string;
  locked?: boolean;
  seats?: number;
  /** Present only for real shop products. */
  price?: number;
  currency?: string;
}

export interface SceneConstraints {
  /** Minimum comfortable walkway width in metres. */
  minWalkway: number;
}

export interface Scene {
  version: 1;
  id: string;
  room: Room;
  objects: SceneObject[];
  constraints: SceneConstraints;
}

/** Pose = where an object sits and which way it faces. */
export interface Pose {
  x: number;
  z: number;
  rotation: number;
}
