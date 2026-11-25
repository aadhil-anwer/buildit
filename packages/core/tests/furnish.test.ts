import { describe, expect, test } from "vitest";
import { roomCheck } from "../src/check";
import { addEssentialSteps, essentials, furnishRoom, inferKind, ROOM_KINDS, type RoomKind } from "../src/furnish";
import { checkPose } from "../src/layout/validate";
import { makeOpening, RECT_WALL } from "../src/room";
import { emptyRoom, sampleBedroom, sampleMajlis } from "../src/templates";

// The room a new user types in: door on the south wall, a window on the north wall.
const typed = (width: number, length: number) =>
  emptyRoom({ name: "Room", width, length, height: 2.8, openings: [makeOpening("door", RECT_WALL.south, 0.4, 0.9), makeOpening("window", RECT_WALL.north, 1.0, 1.4)] });

describe.each([
  ["bedroom", 4.0, 3.6],
  ["living", 5.2, 4.3],
  ["majlis", 7.0, 5.0],
  ["office", 3.2, 3.0],
] as [RoomKind, number, number][])("furnishing a %s (%s x %s m)", (kind, w, l) => {
  const result = furnishRoom(typed(w, l), kind);

  test("adds the whole starter set, each piece one frame, every pose a legal one", () => {
    expect(result.skipped).toEqual([]);
    expect(result.frames).toHaveLength(result.added.length);
    for (const o of result.scene.objects) expect(checkPose(result.scene, o, o).ok, o.id).toBe(true);
  });

  test("leaves the room passing its own check: doors open, walkways wide enough", () => {
    const failing = roomCheck(result.scene).rules.filter((r) => r.status !== "pass").map((r) => `${r.id} ${r.status} ${r.cm}/${r.need}`);
    expect(failing).toEqual([]);
  });

  test("ticks off every essential and is recognised as that kind of room", () => {
    expect(essentials(result.scene, kind).missing).toEqual([]);
    expect(inferKind(result.scene)).toBe(kind);
  });
});

test("a room too small for the set skips what doesn't fit and says which", () => {
  const { skipped, scene } = furnishRoom(typed(2.2, 2.4), "living");
  expect(skipped.length).toBeGreaterThan(0);
  for (const o of scene.objects) expect(checkPose(scene, o, o).ok).toBe(true);
});

test("a small bedroom gets a smaller bed", () => {
  const { scene } = furnishRoom(typed(2.6, 3.0), "bedroom");
  expect(scene.objects.find((o) => o.type === "bed")?.catalogId).toBe("bed_single");
});

test("essentials count what is already there, and an empty room has no kind yet", () => {
  expect(essentials(sampleBedroom(), "bedroom").done).toEqual(["bed", "nightstand", "wardrobe", "rug"]);
  expect(essentials(sampleBedroom(), "bedroom").missing).toEqual(["floor_lamp"]);
  expect(inferKind(sampleMajlis())).toBe("majlis");
  expect(inferKind(typed(4, 4))).toBeNull();
  expect(ROOM_KINDS).toHaveLength(4);
});

test("across many room sizes and door/window walls, furnishing never leaves a failing room or an illegal pose", () => {
  const started = performance.now();
  let rooms = 0;
  for (const kind of ROOM_KINDS)
    for (const [w, l] of [[3, 3], [3.5, 4.5], [4.5, 3.2], [6, 4], [8, 5.5]])
      for (const [doorWall, windowWall] of [[RECT_WALL.south, RECT_WALL.north], [RECT_WALL.east, RECT_WALL.south], [RECT_WALL.west, RECT_WALL.west]]) {
        const room = emptyRoom({ name: "R", width: w, length: l, height: 2.8, openings: [makeOpening("door", doorWall, 0.3, 0.9), makeOpening("window", windowWall, 1.8, 1.0)] });
        const { scene } = furnishRoom(room, kind);
        rooms++;
        for (const o of scene.objects) expect(checkPose(scene, o, o).ok, `${kind} ${w}x${l} ${o.id}`).toBe(true);
        expect(roomCheck(scene).rules.filter((r) => r.status !== "pass").map((r) => r.id), `${kind} ${w}x${l} door ${doorWall}`).toEqual([]);
      }
  expect(rooms).toBe(60);
  // About 220 ms per room on an idle desktop; this only catches a real slowdown, not a busy machine or a slow CI runner.
  expect((performance.now() - started) / rooms).toBeLessThan(2000);
}, 60_000);

test("a missing essential is placed like the starter set would, and the checklist ticks it off", () => {
  const { scene } = furnishRoom(typed(4.0, 3.6), "bedroom");
  const noLamp = { ...scene, objects: scene.objects.filter((o) => o.type !== "floor_lamp") };
  expect(essentials(noLamp, "bedroom").missing).toEqual(["floor_lamp"]);
  const run = addEssentialSteps(noLamp, "bedroom", "floor_lamp");
  let step = run.next();
  while (!step.done) step = run.next();
  expect(step.value?.ok).toBe(true);
  expect(essentials(step.value!.scene, "bedroom").missing).toEqual([]);
  expect(roomCheck(step.value!.scene).rules.filter((r) => r.status !== "pass")).toEqual([]);
});

test("the room the dimensions screen builds (door 30 cm from a corner, centred window, 90 cm walkway) furnishes clean", () => {
  const base = emptyRoom({ name: "Living room", width: 5, length: 4.2, height: 2.8, openings: [makeOpening("door", RECT_WALL.south, 0.3, 0.9), makeOpening("window", RECT_WALL.north, 1.8, 1.4)] });
  for (const minWalkway of [0.75, 0.8, 0.9]) {
    const { scene } = furnishRoom({ ...base, constraints: { ...base.constraints, minWalkway } }, "living");
    expect(roomCheck(scene).rules.filter((r) => r.status !== "pass").map((r) => `${r.id} ${r.cm}/${r.need}`), `walkway ${minWalkway}`).toEqual([]);
  }
});
