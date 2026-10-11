import { sampleBedroom } from "@buildit/core";
import * as reporter from "@/lib/report";
import { supabase } from "@/lib/supabase";
import { createRemote } from "./remote";

jest.mock("@/lib/supabase", () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));
const db = supabase as unknown as { rpc: jest.Mock; from: jest.Mock };

/** A stand-in for supabase-js's query builder: every step returns itself, and awaiting it gives `result`. */
interface Query { select: jest.Mock; update: jest.Mock; eq: jest.Mock; maybeSingle: jest.Mock; then: (resolve: (v: unknown) => void) => void }
function query(result: unknown): Query {
  const q: Query = { select: jest.fn(() => q), update: jest.fn(() => q), eq: jest.fn(() => q), maybeSingle: jest.fn(() => Promise.resolve(result)), then: (resolve: (v: unknown) => void) => resolve(result) };
  return q;
}
const remote = createRemote("user-1");
const scene = sampleBedroom();

describe("rooms", () => {
  test("creating a room goes through create_room and returns the new id", async () => {
    db.rpc.mockResolvedValue({ data: "uuid-1", error: null });
    expect(await remote.createRoom("Bedroom", scene)).toBe("uuid-1");
    expect(db.rpc).toHaveBeenCalledWith("create_room", { p_name: "Bedroom", p_scene: scene });
  });

  test("a reply that is not an id is refused", async () => {
    db.rpc.mockResolvedValue({ data: { surprise: true }, error: null });
    await expect(remote.createRoom("Bedroom", scene)).rejects.toThrow();
  });

  test("saving goes through save_version as an autosave, and server errors are raised as they are", async () => {
    db.rpc.mockResolvedValue({ data: "v1", error: null });
    await remote.saveVersion("r1", scene);
    expect(db.rpc).toHaveBeenCalledWith("save_version", { p_room_id: "r1", p_scene: scene, p_kind: "autosave", p_label: null });
    const error = Object.assign(new Error("room not found"), { code: "P0002" });
    db.rpc.mockResolvedValue({ data: null, error });
    await expect(remote.saveVersion("r1", scene)).rejects.toBe(error);
  });

  test("renaming updates only that room's name", async () => {
    const q = query({ error: null });
    db.from.mockReturnValue(q);
    await remote.renameRoom("r1", "Guest room");
    expect(db.from).toHaveBeenCalledWith("rooms");
    expect(q.update).toHaveBeenCalledWith({ name: "Guest room" });
    expect(q.eq).toHaveBeenCalledWith("id", "r1");
  });

  test("listing reads each room with its current scene and turns the time into milliseconds", async () => {
    db.from.mockReturnValue(query({ data: [{ id: "r1", name: "Bedroom", updated_at: "2026-10-12T10:00:00Z", current: { scene } }], error: null }));
    expect(await remote.listRooms()).toEqual([{ id: "r1", name: "Bedroom", updatedAt: Date.parse("2026-10-12T10:00:00Z"), scene }]);
  });

  test("a room with no current version is skipped and reported; one of the wrong shape fails the whole read", async () => {
    const report = jest.spyOn(reporter, "report").mockImplementation(() => undefined);
    db.from.mockReturnValue(query({ data: [{ id: "r1", name: "Empty", updated_at: "2026-10-12T10:00:00Z", current: null }], error: null }));
    expect(await remote.listRooms()).toEqual([]);
    expect(report).toHaveBeenCalled();
    db.from.mockReturnValue(query({ data: [{ id: 7 }], error: null }));
    await expect(remote.listRooms()).rejects.toThrow();
  });
});

describe("walkway preference", () => {
  test("reads the profile's value, or nothing when there is no profile row", async () => {
    db.from.mockReturnValue(query({ data: { walkway_pref_cm: 75 }, error: null }));
    expect(await remote.getWalkway()).toBe(75);
    db.from.mockReturnValue(query({ data: null, error: null }));
    expect(await remote.getWalkway()).toBeNull();
  });

  test("a value other than 75 or 90 is refused", async () => {
    db.from.mockReturnValue(query({ data: { walkway_pref_cm: 80 }, error: null }));
    await expect(remote.getWalkway()).rejects.toThrow();
  });

  test("setting updates the signed-in user's own profile", async () => {
    const q = query({ error: null });
    db.from.mockReturnValue(q);
    await remote.setWalkway(75);
    expect(db.from).toHaveBeenCalledWith("profiles");
    expect(q.update).toHaveBeenCalledWith({ walkway_pref_cm: 75 });
    expect(q.eq).toHaveBeenCalledWith("id", "user-1");
  });

  test("a failed update is raised", async () => {
    const error = new Error("offline");
    db.from.mockReturnValue(query({ error }));
    await expect(remote.setWalkway(90)).rejects.toBe(error);
  });
});
