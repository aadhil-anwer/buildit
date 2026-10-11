import { roomBounds, RECT_WALL } from "@buildit/core";
import { buildRoom, parseMetres, RANGE, type DimensionsForm } from "./dimensions";

const form = (over: Partial<DimensionsForm> = {}): DimensionsForm => ({ name: "Bedroom", width: "4", length: "3.5", height: "2.8", door: "south", window: null, ...over });
const ok = (f: DimensionsForm) => {
  const r = buildRoom(f);
  if (!("scene" in r)) throw new Error(`expected a room, got errors ${JSON.stringify(r.errors)}`);
  return r.scene;
};

describe("parseMetres", () => {
  test.each([["4", 4], ["4.5", 4.5], [" 4,5 ", 4.5], ["٤٫٥", 4.5], ["١٢", 12], ["0.75", 0.75]])("%s reads as %f", (text, value) => expect(parseMetres(text)).toBe(value));
  test.each(["", "abc", "4.5.1", "4 m", "-3", "1e3", "4,5,6"])("%j is not a size", (text) => expect(parseMetres(text)).toBeNaN());
});

describe("buildRoom", () => {
  test("makes a rectangular room of the typed size with the door on the chosen wall", () => {
    const scene = ok(form({ door: "east" }));
    const b = roomBounds(scene.room);
    expect([b.maxX - b.minX, b.maxZ - b.minZ]).toEqual([4, 3.5]);
    expect(scene.room).toMatchObject({ name: "Bedroom", height: 2.8 });
    expect(scene.room.openings).toEqual([expect.objectContaining({ type: "door", wall: RECT_WALL.east, width: 0.9 })]);
    expect(scene.objects).toEqual([]);
  });

  test("adds a window on the chosen wall, centred", () => {
    const scene = ok(form({ window: "north" }));
    const window = scene.room.openings.find((o) => o.type === "window");
    expect(window).toMatchObject({ wall: RECT_WALL.north, width: 1.4 });
    expect(window!.offset).toBeCloseTo((4 - 1.4) / 2);
  });

  test("trims the name, and refuses a blank one", () => {
    expect(ok(form({ name: "  Guest room " })).room.name).toBe("Guest room");
    expect(buildRoom(form({ name: "   " }))).toEqual({ errors: { name: true } });
  });

  test.each([
    [{ width: "1" }, "width"], [{ width: "13" }, "width"], [{ length: "abc" }, "length"], [{ height: "1.5" }, "height"], [{ height: "5" }, "height"],
  ] as const)("sizes outside the allowed range are flagged: %j", (over, field) => expect(buildRoom(form(over))).toEqual({ errors: { [field]: true } }));

  test("reports every wrong field at once", () => expect(buildRoom(form({ name: "", width: "x", height: "9" }))).toEqual({ errors: { name: true, width: true, height: true } }));

  test("a door and window that would overlap on a short wall are refused", () => {
    expect(buildRoom(form({ width: "2", door: "north", window: "north" }))).toEqual({ errors: { openings: true } });
    expect("scene" in buildRoom(form({ width: "4", door: "north", window: "north" }))).toBe(true);
  });

  test("the smallest allowed room still fits its door", () => expect("scene" in buildRoom(form({ width: "1.5", length: "1.5", door: "east" }))).toBe(true));

  test("the allowed ranges are published for the form's messages", () => expect(RANGE).toEqual({ size: [1.5, 12], height: [2, 4] }));
});
