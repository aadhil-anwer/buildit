import type { SceneObject } from "@buildit/core";

/** What a part is made of. `main` is the piece's own colour; the rest are fixed accents. */
export type Tone = "main" | "linen" | "dark" | "brass" | "wood";

/** A box or cylinder, `y` being its underside and `z` positive towards the piece's front. Sizes in metres. */
export interface Part {
  shape: "box" | "cyl";
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  tone: Tone;
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number, tone: Tone = "main"): Part => ({ shape: "box", w, h, d, x, y, z, tone });
const cyl = (r: number, h: number, x: number, y: number, z: number, tone: Tone = "main"): Part => ({ shape: "cyl", w: 2 * r, h, d: 2 * r, x, y, z, tone });

/** Four legs, one in each corner, inset from the edge. */
const legs = (w: number, d: number, h: number, size: number, inset: number, tone: Tone = "dark") =>
  [-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(size, h, size, sx * (w / 2 - inset), 0, sz * (d / 2 - inset), tone)));

const table = (o: SceneObject): Part[] => [box(o.w, 0.04, o.d, 0, o.h - 0.04, 0), ...legs(o.w, o.d, o.h - 0.04, 0.04, 0.06)];
const sofa = (o: SceneObject): Part[] => [
  box(o.w, 0.38, o.d, 0, 0, 0),
  box(o.w, Math.max(0.2, o.h - 0.3), 0.24, 0, 0.3, -o.d / 2 + 0.12),
  ...[-1, 1].map((s) => box(0.2, 0.3, o.d - 0.2, s * (o.w / 2 - 0.1), 0.3, 0.1)),
];
const chair = (o: SceneObject): Part[] => [box(o.w, 0.06, o.d, 0, 0.42, 0), box(o.w, o.h - 0.45, 0.05, 0, 0.45, -o.d / 2 + 0.025), ...legs(o.w, o.d, 0.42, 0.03, 0.04)];
const bed = (o: SceneObject): Part[] => [
  box(o.w, 0.22, o.d, 0, 0, 0, "wood"),
  box(o.w - 0.06, 0.2, o.d - 0.16, 0, 0.2, 0.05, "linen"),
  box(o.w + 0.04, o.h, 0.1, 0, 0, -o.d / 2 + 0.05),
  ...[-1, 1].map((s) => box(o.w / 2 - 0.1, 0.13, 0.42, (s * o.w) / 4, 0.4, -o.d / 2 + 0.38, "linen")),
];

const BUILDERS: Partial<Record<SceneObject["type"], (o: SceneObject) => Part[]>> = {
  bed,
  sofa,
  armchair: sofa,
  majlis_seat: sofa,
  desk: table,
  coffee_table: table,
  dining_table: table,
  side_table: table,
  dining_chair: chair,
  office_chair: chair,
  round_table: (o) => [cyl(o.w / 2, 0.04, 0, o.h - 0.04, 0), cyl(0.04, o.h - 0.04, 0, 0, 0, "dark")],
  rug: (o) => [box(o.w, 0.016, o.d, 0, 0, 0)],
  tv_unit: (o) => [box(o.w, o.h, o.d, 0, 0, 0), box(o.w * 0.7, 0.62, 0.035, 0, o.h + 0.04, 0, "dark")],
  wardrobe: (o) => [box(o.w, o.h, o.d, 0, 0, 0), ...[-1, 1].map((s) => box(0.012, 0.35, 0.02, s * 0.05, o.h * 0.5, o.d / 2 + 0.012, "brass"))],
  bookshelf: (o) => [box(o.w, o.h, o.d, 0, 0, 0), ...[1, 2, 3, 4].map((i) => box(o.w - 0.04, 0.012, 0.005, 0, (o.h * i) / 5, o.d / 2 + 0.002, "linen"))],
  floor_lamp: (o) => [cyl(0.14, 0.025, 0, 0, 0, "dark"), cyl(0.012, o.h - 0.4, 0, 0.025, 0, "brass"), cyl(0.15, 0.28, 0, o.h - 0.4, 0, "linen")],
  plant: (o) => [cyl(o.w * 0.32, 0.3, 0, 0, 0, "wood"), cyl(o.w / 2, o.h - 0.3, 0, 0.3, 0)],
};

/** The shapes that make up one piece of furniture: a few boxes and cylinders, in its own space (centre of its footprint, front towards +z). */
export const partsFor = (o: SceneObject): Part[] => BUILDERS[o.type]?.(o) ?? [box(o.w, o.h, o.d, 0, 0, 0)];
