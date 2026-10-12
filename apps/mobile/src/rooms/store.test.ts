import AsyncStorage from "@react-native-async-storage/async-storage";
import { sampleBedroom } from "@buildit/core";
import * as reporter from "@/lib/report";
import { useRooms } from "./store";

beforeEach(async () => {
  await AsyncStorage.clear();
  useRooms.setState({ rooms: [] });
});

test("adding a room puts it first, marked as not yet synced", () => {
  const first = useRooms.getState().add("Bedroom", sampleBedroom());
  const second = useRooms.getState().add("Study", sampleBedroom());
  const { rooms } = useRooms.getState();
  expect(rooms.map((r) => r.id)).toEqual([second, first]);
  expect(rooms[0]).toMatchObject({ name: "Study", dirty: true });
  expect(rooms[0]).not.toHaveProperty("remoteId");
});

test("saving a scene or renaming bumps the edit time and marks the room dirty", () => {
  const id = useRooms.getState().add("Bedroom", sampleBedroom());
  useRooms.setState((s) => ({ rooms: s.rooms.map((r) => ({ ...r, dirty: false, updatedAt: 1 })) }));
  useRooms.getState().rename(id, "Guest room");
  expect(useRooms.getState().rooms[0]).toMatchObject({ name: "Guest room", dirty: true });
  expect(useRooms.getState().rooms[0].updatedAt).toBeGreaterThan(1);
  const scene = { ...sampleBedroom(), id: "changed" };
  useRooms.getState().save(id, scene);
  expect(useRooms.getState().rooms[0].scene.id).toBe("changed");
});

test("removing a room removes only that room", () => {
  const a = useRooms.getState().add("A", sampleBedroom());
  const b = useRooms.getState().add("B", sampleBedroom());
  useRooms.getState().remove(a);
  expect(useRooms.getState().rooms.map((r) => r.id)).toEqual([b]);
});

test("rooms survive a restart", async () => {
  useRooms.getState().add("Bedroom", sampleBedroom());
  await new Promise((resolve) => setTimeout(resolve, 0));
  const saved = await AsyncStorage.getItem("rooms");
  useRooms.setState({ rooms: [] }); // a fresh launch starts empty in memory...
  await AsyncStorage.setItem("rooms", saved as string); // ...while the disk still holds what was saved
  await useRooms.persist.rehydrate();
  expect(useRooms.getState().rooms.map((r) => r.name)).toEqual(["Bedroom"]);
});

test("a stored room whose scene is unreadable is dropped and reported, not trusted", async () => {
  const report = jest.spyOn(reporter, "report").mockImplementation(() => undefined);
  const good = { id: "g", name: "Good", scene: sampleBedroom(), updatedAt: 5, dirty: false };
  const bad = { id: "b", name: "Bad", scene: { version: 1, nonsense: true }, updatedAt: 6, dirty: false };
  await AsyncStorage.setItem("rooms", JSON.stringify({ state: { rooms: [bad, good] }, version: 1 }));
  await useRooms.persist.rehydrate();
  expect(useRooms.getState().rooms.map((r) => r.id)).toEqual(["g"]);
  expect(String(report.mock.calls[0][0])).toContain("Bad");
  expect(report.mock.calls[0][1]).toEqual({ source: "rooms-store" });
});

test("storage that is not even the right shape yields no rooms and a report", async () => {
  const report = jest.spyOn(reporter, "report").mockImplementation(() => undefined);
  await AsyncStorage.setItem("rooms", JSON.stringify({ state: { rooms: "oops" }, version: 1 }));
  await useRooms.persist.rehydrate();
  expect(useRooms.getState().rooms).toEqual([]);
  expect(report).toHaveBeenCalled();
});

test("saving a version keeps the scene as it is now, marks the room to sync, but is not an edit", () => {
  const scene = sampleBedroom();
  const id = useRooms.getState().add("Bedroom", scene);
  useRooms.setState((s) => ({ rooms: s.rooms.map((r) => ({ ...r, dirty: false, updatedAt: 1 })) }));
  useRooms.getState().saveVersion(id, "Before the rug");
  expect(useRooms.getState().rooms[0]).toMatchObject({ dirty: true, updatedAt: 1 }); // to sync, but the edited time stays
  useRooms.getState().save(id, { ...scene, id: "later" });
  const room = useRooms.getState().rooms[0];
  expect(room.versions).toHaveLength(1);
  expect(room.versions![0]).toMatchObject({ label: "Before the rug", scene: { id: scene.id } });
});

test("a room keeps only its newest 30 versions", () => {
  const id = useRooms.getState().add("Bedroom", sampleBedroom());
  for (let i = 0; i < 35; i++) useRooms.getState().saveVersion(id, `v${i}`);
  const labels = useRooms.getState().rooms[0].versions!.map((v) => v.label);
  expect(labels).toHaveLength(30);
  expect(labels[0]).toBe("v5");
  expect(labels[29]).toBe("v34");
});

test("saved versions survive a restart, and an unreadable one is dropped and reported", async () => {
  const report = jest.spyOn(reporter, "report").mockImplementation(() => undefined);
  const ok = { id: "v1", label: null, scene: sampleBedroom(), createdAt: 3 };
  const bad = { id: "v2", label: "x", scene: { nope: 1 }, createdAt: 4 };
  const room = { id: "r", name: "Room", scene: sampleBedroom(), updatedAt: 5, dirty: false, versions: [ok, bad] };
  await AsyncStorage.setItem("rooms", JSON.stringify({ state: { rooms: [room] }, version: 1 }));
  await useRooms.persist.rehydrate();
  expect(useRooms.getState().rooms[0].versions!.map((v) => v.id)).toEqual(["v1"]);
  expect(String(report.mock.calls[0][0])).toContain("saved version");
  expect(report.mock.calls[0][1]).toEqual({ source: "rooms-store" });
});
