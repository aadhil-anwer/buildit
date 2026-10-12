import { design, sampleBedroom, sampleLivingRoom, type Scene } from "@buildit/core";
import { t } from "@/i18n";
import { changeLines } from "./changes";

const base = () => sampleBedroom();
const edit = (s: Scene, id: string, patch: Partial<Scene["objects"][number]>): Scene => ({ ...s, objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) });

test("nothing changed means no lines", () => expect(changeLines(base(), base())).toEqual([]));

test("a piece that moved says how far and which way, using the dominant direction", () => {
  const s = base();
  const bed = s.objects.find((o) => o.type === "bed")!;
  expect(changeLines(s, edit(s, bed.id, { x: bed.x + 0.15 }))).toEqual([t("aiMove", t("iBed"), 15, t("dE"))]);
  expect(changeLines(s, edit(s, bed.id, { z: bed.z - 0.3 }))).toEqual([t("aiMove", t("iBed"), 30, t("dN"))]);
  expect(changeLines(s, edit(s, bed.id, { x: bed.x - 0.4, z: bed.z + 0.1 }))[0]).toContain(t("dW"));
});

test("a move under 5 cm is not worth saying; a turn in place is", () => {
  const s = base();
  const bed = s.objects.find((o) => o.type === "bed")!;
  expect(changeLines(s, edit(s, bed.id, { x: bed.x + 0.03 }))).toEqual([]);
  expect(changeLines(s, edit(s, bed.id, { rotation: (bed.rotation + 90) % 360 }))).toEqual([t("aiTurned", t("iBed"))]);
});

test("added, removed and recoloured pieces, and the finishes", () => {
  const s = base();
  const wardrobe = s.objects.find((o) => o.type === "wardrobe")!;
  const added = { ...s, objects: [...s.objects, { ...wardrobe, id: "wardrobe_9", type: "desk" as const }] };
  expect(changeLines(s, added)).toEqual([t("aiAdded", t("iDesk"))]);
  expect(changeLines(s, { ...s, objects: s.objects.filter((o) => o.id !== wardrobe.id) })).toEqual([t("aiRemoved", t("iWardrobe"))]);
  expect(changeLines(s, edit(s, wardrobe.id, { color: "#123456" }))).toEqual([t("aiRecolour", t("iWardrobe"))]);
  const all = { ...s, objects: s.objects.map((o) => ({ ...o, color: "#123456" })) };
  expect(changeLines(s, all)).toEqual([t("aiRecolourN", s.objects.length)]);
  const painted = { ...s, room: { ...s.room, wallColor: design.materials.wall.ink, floorColor: design.materials.floor.stone } };
  expect(changeLines(s, painted)).toEqual([t("aiWall"), t("aiFloor")]);
});

test("a long list is cut short and says how many more", () => {
  const s = sampleLivingRoom();
  const moved = { ...s, objects: s.objects.map((o) => ({ ...o, x: o.x + 0.5 })) };
  const lines = changeLines(s, moved);
  expect(lines).toHaveLength(8);
  expect(lines[7]).toBe(t("aiMore", s.objects.length - 7));
});
