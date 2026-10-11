import { emptyRoom, makeOpening, RECT_WALL, validateOpenings, type Scene } from "@buildit/core";

export type Wall = keyof typeof RECT_WALL;
export interface DimensionsForm {
  name: string;
  width: string;
  length: string;
  height: string;
  door: Wall;
  window: Wall | null;
}
type Field = "name" | "width" | "length" | "height" | "openings";
export type FormErrors = Partial<Record<Field, true>>;

/** Allowed sizes in metres: the floor's width and length, and the ceiling height. */
export const RANGE = { size: [1.5, 12], height: [2, 4] } as const;
const DOOR = { offset: 0.3, width: 0.9 }; // near a corner, like the sample rooms
const WINDOW_WIDTH = 1.4;

/** A size typed by hand: Latin or Arabic-Indic digits, with '.', ',' or '٫' as the decimal mark. NaN unless it is one plain number. */
export function parseMetres(text: string): number {
  const plain = text.trim().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[,٫]/, ".");
  return /^\d+(\.\d+)?$/.test(plain) ? Number(plain) : NaN;
}

const within = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi;

/** The typed room as a scene, or which fields are wrong (all of them at once). */
export function buildRoom(f: DimensionsForm): { scene: Scene } | { errors: FormErrors } {
  const [width, length, height] = [parseMetres(f.width), parseMetres(f.length), parseMetres(f.height)];
  const errors: FormErrors = {
    ...(!f.name.trim() && { name: true }),
    ...(!within(width, RANGE.size) && { width: true }),
    ...(!within(length, RANGE.size) && { length: true }),
    ...(!within(height, RANGE.height) && { height: true }),
  };
  if (Object.keys(errors).length) return { errors };

  const wallLength = (wall: Wall) => (wall === "north" || wall === "south" ? width : length);
  const openings = [makeOpening("door", RECT_WALL[f.door], DOOR.offset, DOOR.width)];
  if (f.window) openings.push(makeOpening("window", RECT_WALL[f.window], (wallLength(f.window) - WINDOW_WIDTH) / 2, WINDOW_WIDTH));
  const scene = emptyRoom({ name: f.name.trim(), width, length, height, openings });
  const [door, window] = [openings[0], openings[1]];
  const overlap = window && window.wall === door.wall && window.offset < door.offset + door.width;
  return validateOpenings(scene.room).length || overlap ? { errors: { openings: true } } : { scene };
}
