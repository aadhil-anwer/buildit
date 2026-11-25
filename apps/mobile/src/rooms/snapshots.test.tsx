import { render, screen } from "@testing-library/react-native";
import { essentials, inferKind, sampleLivingRoom } from "@buildit/core";
import { formatNumber, t } from "@/i18n";
import { RoomCard } from "@/screens/rooms/room-card";
import type { LocalRoom } from "./store";
import { sceneKey, useSnapshots } from "./snapshots";

const mockFiles = new Map<string, boolean>();
jest.mock("expo-file-system", () => {
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) { this.uri = parts.map((p) => (typeof p === "string" ? p : p.uri)).join("/"); }
    get exists() { return true; }
    create() {}
  }
  class File extends Directory {
    get exists() { return mockFiles.has(this.uri); }
    delete() { mockFiles.delete(this.uri); }
    move(to: File) { mockFiles.delete(this.uri); mockFiles.set(to.uri, true); return Promise.resolve(); }
  }
  return { Directory, File, Paths: { document: "file:///docs" } };
});

const room = (scene = sampleLivingRoom()): LocalRoom => ({ id: "r1", name: "Living", scene, updatedAt: Date.now(), dirty: false });
beforeEach(() => {
  mockFiles.clear();
  useSnapshots.setState({ shots: {} });
});

test("a room's fingerprint changes when a piece moves, and only then", () => {
  const scene = sampleLivingRoom();
  const piece = scene.objects.find((o) => !o.locked)!;
  expect(sceneKey(scene)).toBe(sceneKey(structuredClone(scene)));
  const moved = { ...scene, objects: scene.objects.map((o) => (o === piece ? { ...o, x: o.x + 0.1 } : o)) };
  expect(sceneKey(moved)).not.toBe(sceneKey(scene));
});

test("keeping a picture moves it out of the temporary folder and replaces (and deletes) the room's old one", async () => {
  mockFiles.set("file:///tmp/a.jpg", true);
  await useSnapshots.getState().keep("r1", { uri: "file:///tmp/a.jpg", of: "k1", score: 90 });
  const first = useSnapshots.getState().shots.r1.uri;
  expect(mockFiles.has(first)).toBe(true);
  mockFiles.set("file:///tmp/b.jpg", true);
  await useSnapshots.getState().keep("r1", { uri: "file:///tmp/b.jpg", of: "k2", score: 97 });
  expect(mockFiles.has(first)).toBe(false);
  expect(useSnapshots.getState().shots.r1).toMatchObject({ of: "k2", score: 97 });
  useSnapshots.getState().forget("r1");
  expect(mockFiles.size).toBe(0);
});

test("a card shows the 3D picture and its score while the room still looks like it, and how many essentials are in", async () => {
  const r = room();
  useSnapshots.setState({ shots: { r1: { uri: "file:///docs/room-pictures/r1-x.jpg", of: sceneKey(r.scene), score: 94 } } });
  await render(<RoomCard room={r} onOpen={jest.fn()} onDelete={jest.fn()} />);
  const e = essentials(r.scene, inferKind(r.scene)!);
  const line = `${t("cardScore", formatNumber(94))} · ${t("cardEssentials", formatNumber(e.done.length), formatNumber(e.done.length + e.missing.length))}`;
  expect(screen.getByText(line)).toBeTruthy();
});

test("a picture of an older state is not shown, and neither is its score: the plan and the essentials are", async () => {
  const r = room();
  useSnapshots.setState({ shots: { r1: { uri: "file:///docs/room-pictures/r1-old.jpg", of: "older", score: 61 } } });
  await render(<RoomCard room={r} onOpen={jest.fn()} onDelete={jest.fn()} />);
  expect(screen.queryByText(new RegExp(t("cardScore", formatNumber(61))))).toBeNull();
  expect(screen.getByText(/essentials/)).toBeTruthy();
});
