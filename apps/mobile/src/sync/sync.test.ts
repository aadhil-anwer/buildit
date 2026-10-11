import { sampleBedroom, sampleLivingRoom, type Scene } from "@buildit/core";
import * as reporter from "@/lib/report";
import { useRooms, type LocalRoom } from "@/rooms/store";
import { useSettings } from "@/settings/store";
import { syncOnce, type Remote, type RemoteRoom } from "./sync";

/** An in-memory stand-in for the server: rooms with versions, and the profile's walkway. */
function fakeRemote(initial: RemoteRoom[] = []) {
  const rooms = new Map(initial.map((r) => [r.id, { ...r }]));
  const calls: string[] = [];
  let n = 0;
  let walkway: 75 | 90 | null = null;
  const remote: Remote = {
    createRoom: (name, scene) => {
      const id = `remote-${++n}`;
      rooms.set(id, { id, name, scene, updatedAt: Date.now() });
      calls.push(`create ${name}`);
      return Promise.resolve(id);
    },
    saveVersion: (id, scene) => {
      const r = rooms.get(id);
      if (!r) return Promise.reject(new Error("room not found"));
      rooms.set(id, { ...r, scene, updatedAt: Date.now() });
      calls.push(`save ${id}`);
      return Promise.resolve();
    },
    renameRoom: (id, name) => {
      const r = rooms.get(id);
      if (r) rooms.set(id, { ...r, name });
      calls.push(`rename ${id}`);
      return Promise.resolve();
    },
    listRooms: () => Promise.resolve([...rooms.values()]),
    getWalkway: () => Promise.resolve(walkway),
    setWalkway: (cm) => Promise.resolve(void (walkway = cm)),
  };
  return { remote, rooms, calls, setWalkwayOnServer: (cm: 75 | 90) => (walkway = cm) };
}
const local = (over: Partial<LocalRoom> & { id: string }): LocalRoom => ({ name: "Bedroom", scene: sampleBedroom(), updatedAt: 1000, dirty: false, ...over });
const rooms = () => useRooms.getState().rooms;

beforeEach(() => {
  useRooms.setState({ rooms: [], owner: null });
  useSettings.setState({ walkwayCm: 90, walkwayDirty: false });
});

test("pushing: a new room is created on the server and remembered, no longer dirty", async () => {
  const fake = fakeRemote();
  useRooms.setState({ rooms: [local({ id: "a", dirty: true })] });
  await syncOnce(fake.remote);
  expect(fake.calls).toEqual(["create Bedroom"]);
  expect(rooms()[0]).toMatchObject({ id: "a", remoteId: "remote-1", dirty: false });
});

test("pushing: a changed room saves a new version and its name", async () => {
  const fake = fakeRemote([{ id: "r1", name: "Old", scene: sampleBedroom(), updatedAt: 500 }]);
  useRooms.setState({ rooms: [local({ id: "a", remoteId: "r1", name: "Guest room", dirty: true, updatedAt: 2000 })] });
  await syncOnce(fake.remote);
  expect(fake.calls).toEqual(["rename r1", "save r1"]);
  expect(rooms()[0]).toMatchObject({ name: "Guest room", dirty: false });
});

test("pushing: a room that is already in sync is left alone", async () => {
  const fake = fakeRemote([{ id: "r1", name: "Bedroom", scene: sampleBedroom(), updatedAt: 1000 }]);
  useRooms.setState({ rooms: [local({ id: "a", remoteId: "r1" })] });
  await syncOnce(fake.remote);
  expect(fake.calls).toEqual([]);
});

test("pushing: an edit made while the sync is running stays dirty and goes next time", async () => {
  const fake = fakeRemote();
  useRooms.setState({ rooms: [local({ id: "a", dirty: true })] });
  const slow = { ...fake.remote, createRoom: async (name: string, scene: Scene) => {
    const id = await fake.remote.createRoom(name, scene);
    useRooms.getState().rename("a", "Renamed while syncing");
    return id;
  } };
  await syncOnce(slow);
  expect(rooms()[0]).toMatchObject({ name: "Renamed while syncing", dirty: true, remoteId: "remote-1" });
});

test("pushing: a failure stops the sync, keeps the room dirty and is raised so the app can say so", async () => {
  const fake = fakeRemote();
  const error = new Error("offline");
  useRooms.setState({ rooms: [local({ id: "a", dirty: true })] });
  await expect(syncOnce({ ...fake.remote, createRoom: () => Promise.reject(error) })).rejects.toBe(error);
  expect(rooms()[0]).toMatchObject({ dirty: true });
  expect(rooms()[0]).not.toHaveProperty("remoteId");
});

test("pulling: rooms made on another device appear here", async () => {
  const fake = fakeRemote([{ id: "r9", name: "Majlis", scene: sampleLivingRoom(), updatedAt: 7000 }]);
  await syncOnce(fake.remote);
  expect(rooms()).toHaveLength(1);
  expect(rooms()[0]).toMatchObject({ name: "Majlis", remoteId: "r9", dirty: false, updatedAt: 7000 });
});

test("pulling: a newer edit elsewhere replaces an unchanged local copy", async () => {
  const fake = fakeRemote([{ id: "r1", name: "Renamed", scene: sampleLivingRoom(), updatedAt: 9000 }]);
  useRooms.setState({ rooms: [local({ id: "a", remoteId: "r1", updatedAt: 1000 })] });
  await syncOnce(fake.remote);
  expect(rooms()[0]).toMatchObject({ id: "a", name: "Renamed", updatedAt: 9000, dirty: false });
  expect(rooms()[0].scene.room.name).toBe(sampleLivingRoom().room.name);
});

test("pulling: local changes win over a remote edit, and nothing is lost (the other version stays in history)", async () => {
  const fake = fakeRemote([{ id: "r1", name: "Elsewhere", scene: sampleLivingRoom(), updatedAt: 9000 }]);
  useRooms.setState({ rooms: [local({ id: "a", remoteId: "r1", name: "Mine", dirty: true, updatedAt: 8000 })] });
  await syncOnce(fake.remote);
  expect(fake.rooms.get("r1")).toMatchObject({ name: "Mine" });
  expect(rooms()[0]).toMatchObject({ name: "Mine", dirty: false });
});

test("pulling: a room deleted elsewhere is removed here, unless it has unsent changes (then it is sent again)", async () => {
  const fake = fakeRemote();
  useRooms.setState({ rooms: [local({ id: "clean", remoteId: "gone1" }), local({ id: "edited", remoteId: "gone2", dirty: true })] });
  await syncOnce(fake.remote);
  expect(rooms().map((r) => r.id)).toEqual(["edited"]);
  expect(rooms()[0]).toMatchObject({ dirty: false, remoteId: "remote-1" });
});

test("pulling: a remote room whose scene cannot be read is skipped and reported, not trusted", async () => {
  const report = jest.spyOn(reporter, "report").mockImplementation(() => undefined);
  const fake = fakeRemote([{ id: "bad", name: "Broken", scene: { nonsense: true }, updatedAt: 1 }, { id: "ok", name: "Fine", scene: sampleBedroom(), updatedAt: 2 }]);
  await syncOnce(fake.remote);
  expect(rooms().map((r) => r.name)).toEqual(["Fine"]);
  expect(String(report.mock.calls[0][0])).toContain("Broken");
});

test("account switches: a different account on this phone never sees the previous account's rooms", () => {
  useRooms.setState({ rooms: [local({ id: "a", remoteId: "r1" })], owner: "user-1" });
  useRooms.getState().claim("user-2");
  expect(rooms()).toEqual([]);
  expect(useRooms.getState().owner).toBe("user-2");
});

test("account switches: the same account keeps its rooms", () => {
  useRooms.setState({ rooms: [local({ id: "a" })], owner: "user-1" });
  useRooms.getState().claim("user-1");
  expect(rooms()).toHaveLength(1);
});

test("account switches: rooms from before accounts were tracked are adopted by the first account", () => {
  useRooms.setState({ rooms: [local({ id: "a" })], owner: null });
  useRooms.getState().claim("user-1");
  expect(rooms()).toHaveLength(1);
  expect(useRooms.getState().owner).toBe("user-1");
});

test("walkway preference: a change made here is sent", async () => {
  const fake = fakeRemote();
  useSettings.setState({ walkwayCm: 75, walkwayDirty: true });
  await syncOnce(fake.remote);
  expect(await fake.remote.getWalkway()).toBe(75);
  expect(useSettings.getState().walkwayDirty).toBe(false);
});

test("walkway preference: the server's value is taken when nothing here is unsent", async () => {
  const fake = fakeRemote();
  fake.setWalkwayOnServer(75);
  await syncOnce(fake.remote);
  expect(useSettings.getState()).toMatchObject({ walkwayCm: 75, walkwayDirty: false });
});

test("walkway preference: an unsent local choice beats the server's", async () => {
  const fake = fakeRemote();
  fake.setWalkwayOnServer(75);
  useSettings.setState({ walkwayCm: 90, walkwayDirty: true });
  await syncOnce(fake.remote);
  expect(await fake.remote.getWalkway()).toBe(90);
});
