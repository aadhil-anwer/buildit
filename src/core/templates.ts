import { RECT_WALL, makeOpening, rectangleCorners, renumberOpenings } from "./room";
import { createScene, objectFromCatalogId } from "./scene";
import type { Opening, Room, Scene } from "./types";

export interface RoomSpec {
  name: string;
  width: number;
  length: number;
  height: number;
  openings: Opening[];
  floorColor?: string;
  wallColor?: string;
}

export function rectangularRoom(spec: RoomSpec): Room {
  return {
    name: spec.name,
    corners: rectangleCorners(spec.width, spec.length),
    height: spec.height,
    openings: renumberOpenings(spec.openings),
    floorColor: spec.floorColor ?? "#d9cbb6",
    wallColor: spec.wallColor ?? "#f2eee8",
  };
}

function furnish(scene: Scene, items: [catalogId: string, x: number, z: number, rotation: number][]): Scene {
  for (const [catalogId, x, z, rotation] of items) {
    scene.objects.push(objectFromCatalogId(scene, catalogId, { x, z, rotation }));
  }
  return scene;
}

/**
 * Living room for the demo. Deliberately awkward but not broken: the sofa
 * has its back to the TV, the coffee table is stranded by the TV, and the
 * armchair faces the wall beside the door.
 */
export function sampleLivingRoom(): Scene {
  const room = rectangularRoom({
    name: "Living room",
    width: 5.2,
    length: 4.3,
    height: 3,
    openings: [
      makeOpening("door", RECT_WALL.south, 0.4, 0.9),
      makeOpening("window", RECT_WALL.north, 1.6, 2.0),
      makeOpening("window", RECT_WALL.west, 1.2, 1.4),
    ],
  });
  return furnish(createScene(room), [
    ["rug_medium", 2.6, 2.2, 0],
    ["tv_unit", 4.975, 1.6, 270],
    ["sofa_3_seat", 2.3, 2.7, 180],
    ["coffee_table_rect", 3.95, 1.9, 90],
    ["armchair", 3.3, 3.6, 0],
    ["bookshelf", 0.175, 3.6, 90],
    ["side_table", 0.85, 2.75, 0],
    ["floor_lamp", 0.4, 0.4, 0],
    ["plant", 4.8, 0.35, 0],
  ]);
}

export function sampleBedroom(): Scene {
  const room = rectangularRoom({
    name: "Bedroom",
    width: 4.0,
    length: 3.6,
    height: 2.9,
    openings: [
      makeOpening("door", RECT_WALL.south, 0.3, 0.85),
      makeOpening("window", RECT_WALL.west, 1.0, 1.6),
    ],
    floorColor: "#cdbca3",
  });
  return furnish(createScene(room), [
    ["bed_queen", 2.0, 1.075, 0],
    ["nightstand", 0.85, 0.2, 0],
    ["nightstand", 3.15, 0.2, 0],
    ["wardrobe_3", 3.7, 2.0, 270],
    ["desk", 0.3, 2.9, 90],
    ["office_chair", 0.85, 2.9, 270],
    ["rug_small", 2.0, 2.2, 0],
  ]);
}

export function sampleMajlis(): Scene {
  const room = rectangularRoom({
    name: "Majlis",
    width: 7.0,
    length: 5.0,
    height: 3.2,
    openings: [
      makeOpening("door", RECT_WALL.south, 3.0, 1.2, { height: 2.4 }),
      makeOpening("window", RECT_WALL.north, 1.5, 1.6),
      makeOpening("window", RECT_WALL.north, 3.9, 1.6),
    ],
    floorColor: "#e3d6c2",
    wallColor: "#f4efe6",
  });
  return furnish(createScene(room), [
    ["majlis_seat_3m", 3.5, 0.4, 0],
    ["majlis_seat_2m", 0.4, 2.5, 90],
    ["majlis_seat_2m", 6.6, 2.5, 270],
    ["rug_large", 3.5, 2.4, 0],
    ["coffee_table_rect", 3.5, 2.2, 0],
  ]);
}

export function emptyRoom(spec: RoomSpec): Scene {
  return createScene(rectangularRoom(spec));
}

export const TEMPLATES = [
  { id: "living", name: "Living room (demo)", build: sampleLivingRoom },
  { id: "bedroom", name: "Bedroom", build: sampleBedroom },
  { id: "majlis", name: "Majlis", build: sampleMajlis },
] as const;
