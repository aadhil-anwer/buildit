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
