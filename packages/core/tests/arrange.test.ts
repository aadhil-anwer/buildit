import { describe, expect, test } from "vitest";
import { arrange, arrangeAllSteps, samePoses } from "../src/arrange";
import { roomCheck } from "../src/check";
import { furnishRoom, type RoomKind } from "../src/furnish";
import { checkPose } from "../src/layout/validate";
import { makeOpening, RECT_WALL } from "../src/room";
import { emptyRoom } from "../src/templates";
import { TRADITIONS, traditionFit, traditionReport, type TraditionId } from "../src/traditions";

// The room the dimensions screen builds: door 30 cm from a corner of the south wall, window centred on the north wall.
const typed = (w: number, l: number) =>
  emptyRoom({ name: "Room", width: w, length: l, height: 2.8, openings: [makeOpening("door", RECT_WALL.south, 0.3, 0.9), makeOpening("window", RECT_WALL.north, (w - 1.4) / 2, 1.4)] });
const furnished = (kind: RoomKind, w: number, l: number) => furnishRoom(typed(w, l), kind).scene;
const ids = (s: { objects: { id: string }[] }) => s.objects.map((o) => o.id).sort();

describe.each([
  ["bedroom", 4, 3.6],
  ["living", 5, 4.2],
  ["majlis", 6, 4.5],
  ["office", 3.4, 3],
] as [RoomKind, number, number][])("another layout for a %s", (kind, w, l) => {
  const room = furnished(kind, w, l);

  test.each([...TRADITIONS])("%s keeps the same furniture, every pose legal, every room-check rule passing", (tradition) => {
    const a = arrange(room, tradition)!;
    expect(ids(a.scene)).toEqual(ids(room)); // same pieces: nothing added, nothing lost
    for (const o of a.scene.objects) expect(checkPose(a.scene, o, o).ok, `${tradition} ${o.id}`).toBe(true);
    expect(roomCheck(a.scene).rules.filter((r) => r.status === "fail").map((r) => r.id), tradition).toEqual([]);
  });

  test("each tradition's layout follows its own rules at least as well as the plain one does", () => {
    const plain = arrange(room, "practical")!.scene;
    for (const t of TRADITIONS) expect(traditionFit(arrange(room, t)!.scene, t, {}), t).toBeGreaterThanOrEqual(traditionFit(plain, t, {}));
  });
});

test("a layout matches another only when every piece sits within a centimetre and the same turn", () => {
  const room = furnished("living", 5, 4.2);
  const nudge = (d: number, turn = 0) => ({ ...room, objects: room.objects.map((o, i) => (i ? o : { ...o, x: o.x + d, rotation: o.rotation + turn })) });
  expect(samePoses(room, nudge(0.005))).toBe(true);
  expect(samePoses(room, nudge(0.03))).toBe(false);
  expect(samePoses(room, nudge(0, Math.PI / 2))).toBe(false);
  expect(samePoses(room, { ...room, objects: room.objects.slice(1) })).toBe(false);
  expect(arrange(room, "practical")!.moved).toEqual([]); // the app's own furnishing is already the practical plan
});

// Rooms the app furnished (the practical plan) where a tradition's rule fails, and a spot exists that fixes it:
// corners and door walls the kit never offers are where the traditions find a different room.
test.each([
  ["vastu", "bedroom", 4, 3.6, ["vBedHead", "vStorageSW"]],
  ["vastu", "living", 5, 4.2, ["vFaceNE"]],
  ["arabian", "living", 5, 4.2, ["aHostFacesDoor", "aPrivacy"]],
  ["arabian", "majlis", 6, 4.5, ["aHostFacesDoor", "aPrivacy"]],
  ["fengshui", "office", 3.4, 3, ["fCommand"]],
] as [TraditionId, RoomKind, number, number, string[]][])("%s fixes the rules the practical %s fails", (tradition, kind, w, l, rules) => {
  const room = furnished(kind, w, l);
  const status = (s: typeof room) => Object.fromEntries(traditionReport(s, tradition, {}).map((r) => [r.id, r.status]));
  for (const id of rules) expect(status(room)[id], `before ${id}`).toBe("fail");
  const after = status(arrange(room, tradition)!.scene);
  for (const id of rules) expect(after[id], `after ${id}`).toBe("pass");
});

test("Vastu puts the bed's head to the south or east when a wall allows it", () => {
  // Door on the west wall, so the south and east walls are free for a bed (in typed(), the door's swing blocks the east wall).
  const room = emptyRoom({ name: "Room", width: 4, length: 3.6, height: 2.8, openings: [makeOpening("door", RECT_WALL.west, 0.3, 0.9), makeOpening("window", RECT_WALL.north, 1.3, 1.4)] });
  const a = arrange(furnishRoom(room, "bedroom").scene, "vastu")!;
  const head = traditionReport(a.scene, "vastu").find((r) => r.id === "vBedHead")!;
  expect(head.status).toBe("pass");
  expect(["south", "east"]).toContain(head.facts.head);
});

test("with the Qibla wall given, the Gulf layout keeps the bed's feet from pointing at it; without it the rule is left out", () => {
  const room = furnished("bedroom", 4, 3.6);
  expect(traditionReport(arrange(room, "arabian", { qibla: "west" })!.scene, "arabian", { qibla: "west" }).find((r) => r.id === "aQibla")!.status).toBe("pass");
  expect(traditionReport(room, "arabian").find((r) => r.id === "aQibla")!.status).toBe("na");
});

test("rules report what they measured: the angle to the door, the share of open floor", () => {
  const room = furnished("bedroom", 4, 3.6);
  expect(typeof traditionReport(room, "fengshui").find((r) => r.id === "fCommand")!.facts.angle).toBe("number");
  const open = traditionReport(room, "ma").find((r) => r.id === "mOpenFloor")!;
  expect(open.facts.pct).toBeGreaterThan(0);
  expect(open.facts.pct).toBeLessThan(100);
});

test("a locked piece stays exactly where it was, and an empty room has nothing to arrange", () => {
  const room = furnished("living", 5, 4.2);
  const sofa = room.objects.find((o) => o.type === "sofa")!;
  const locked = { ...room, objects: room.objects.map((o) => (o.id === sofa.id ? { ...o, locked: true } : o)) };
  expect(arrange(locked, "vastu")!.scene.objects.find((o) => o.id === sofa.id)).toMatchObject({ x: sofa.x, z: sofa.z, rotation: sofa.rotation });
  expect(arrange(typed(4, 4), "vastu")).toBeNull();
});

test("all five layouts come out in the cards' order", () => {
  const run = arrangeAllSteps(furnished("bedroom", 4, 3.6));
  let step = run.next();
  while (!step.done) step = run.next();
  expect(step.value.map((a) => a.tradition)).toEqual([...TRADITIONS]);
});
