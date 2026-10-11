import { z } from "zod";
import { TYPE_INFO } from "./catalog";
import type { FurnitureType, Scene } from "./types";

const finite = z.number().finite();
const vec2 = z.object({ x: finite, z: finite });
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const furnitureTypes = Object.keys(TYPE_INFO) as [FurnitureType, ...FurnitureType[]];

export const sceneSchema = z.object({
  version: z.literal(1),
  id: z.string().max(64),
  room: z.object({
    name: z.string().max(80),
    corners: z.array(vec2).min(3).max(64),
    height: finite.min(1.8).max(8),
    openings: z
      .array(
        z.object({
          id: z.string().max(40),
          type: z.enum(["door", "window", "opening"]),
          wall: z.number().int().min(0),
          offset: finite,
          width: finite.min(0.2).max(10),
          height: finite.min(0.2).max(8),
          sill: finite.min(0).max(5),
        }),
      )
      .max(40),
    floorColor: color,
    wallColor: color,
  }),
  objects: z
    .array(
      z.object({
        id: z.string().max(60),
        catalogId: z.string().max(80),
        type: z.enum(furnitureTypes),
        name: z.string().max(120),
        w: finite.min(0.05).max(10),
        d: finite.min(0.05).max(10),
        h: finite.min(0.005).max(6),
        x: finite,
        z: finite,
        rotation: finite,
        color,
        locked: z.boolean().optional(),
        seats: z.number().int().min(0).max(20).optional(),
        price: finite.min(0).optional(),
        currency: z.string().max(8).optional(),
      }),
    )
    .max(200),
  constraints: z.object({ minWalkway: finite.min(0.5).max(1.5) }),
});

export function parseScene(data: unknown): Scene | null {
  const r = sceneSchema.safeParse(data);
  return r.success ? (r.data as Scene) : null;
}
