import { renderHook } from "@testing-library/react-native";
import { sampleBedroom } from "@buildit/core";
import { AppState } from "react-native";
import * as reporter from "@/lib/report";
import { useRooms } from "@/rooms/store";
import { useSettings } from "@/settings/store";
import { syncOnce } from "./sync";
import { startSync, useSync, useSyncStatus } from "./use-sync";

let mockUserId: string | undefined = "user-1";
jest.mock("@/auth/session", () => ({ useSession: () => (mockUserId ? { user: { id: mockUserId } } : null) }));
jest.mock("./sync", () => ({ syncOnce: jest.fn() }));
jest.mock("./remote", () => ({ createRemote: jest.fn(() => ({})) }));
const sync = jest.mocked(syncOnce);
let foreground: (state: string) => void = () => undefined;
let stop: () => void = () => undefined;
const removeListener = jest.fn();
const room = (dirty: boolean, name = "Bedroom") => ({ id: "a", name, scene: sampleBedroom(), updatedAt: Date.now(), dirty });
const tick = (ms: number) => jest.advanceTimersByTimeAsync(ms);
const start = async () => {
  stop = startSync("user-1");
  await tick(0);
};

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  sync.mockReset().mockResolvedValue();
  useRooms.setState({ rooms: [], owner: null });
  useSettings.setState({ walkwayDirty: false });
  useSyncStatus.setState({ failed: false });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => ((foreground = listener as (s: string) => void), { remove: removeListener }));
});
afterEach(() => {
  stop();
  stop = () => undefined;
  jest.clearAllTimers();
});

test("startSync: claims the account's rooms (another account's are gone) and syncs once", async () => {
  useRooms.setState({ owner: "someone-else", rooms: [room(false)] });
  await start();
  expect(useRooms.getState()).toMatchObject({ owner: "user-1", rooms: [] });
  expect(sync).toHaveBeenCalledTimes(1);
});

test("startSync: a burst of edits syncs once, two seconds after the last", async () => {
  await start();
  sync.mockClear();
  useRooms.setState({ rooms: [room(true)] });
  await tick(1500);
  useRooms.setState({ rooms: [room(true, "Again")] });
  await tick(1900);
  expect(sync).not.toHaveBeenCalled();
  await tick(200);
  expect(sync).toHaveBeenCalledTimes(1);
});

test("startSync: an unsent walkway choice also syncs", async () => {
  await start();
  sync.mockClear();
  useSettings.setState({ walkwayCm: 75, walkwayDirty: true });
  await tick(2100);
  expect(sync).toHaveBeenCalledTimes(1);
});

test("startSync: a room deleted here, or a version saved here, also syncs", async () => {
  useRooms.setState({ owner: "user-1", rooms: [{ ...room(false), remoteId: "srv", versions: [] }] });
  await start();
  sync.mockClear();
  useRooms.getState().remove("a");
  await tick(2100);
  expect(sync).toHaveBeenCalledTimes(1);
  useRooms.setState({ deleted: [], rooms: [{ ...room(false), remoteId: "srv" }] });
  sync.mockClear();
  useRooms.getState().saveVersion("a", "Saved version");
  await tick(2100);
  expect(sync).toHaveBeenCalledTimes(1);
});

test("startSync: changes that are not unsent edits (what sync itself writes) do not start another sync", async () => {
  await start();
  sync.mockClear();
  useRooms.setState({ rooms: [room(false)] });
  await tick(5000);
  expect(sync).not.toHaveBeenCalled();
});

test("startSync: returning to the app syncs", async () => {
  await start();
  sync.mockClear();
  foreground("active");
  await tick(0);
  expect(sync).toHaveBeenCalledTimes(1);
  foreground("background");
  await tick(0);
  expect(sync).toHaveBeenCalledTimes(1);
});

test("startSync: offline: marks sync as failed without alarming Sentry, then retries after 30 s and recovers", async () => {
  const report = jest.spyOn(reporter, "report").mockImplementation(() => undefined);
  sync.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await start();
  expect(useSyncStatus.getState().failed).toBe(true);
  expect(report).not.toHaveBeenCalled();
  await tick(30_000);
  expect(sync).toHaveBeenCalledTimes(2);
  expect(useSyncStatus.getState().failed).toBe(false);
});

test("startSync: any other failure is reported", async () => {
  const report = jest.spyOn(reporter, "report").mockImplementation(() => undefined);
  sync.mockRejectedValueOnce(new Error("permission denied for table rooms"));
  await start();
  expect(report).toHaveBeenCalledWith(expect.any(Error), { source: "sync" });
  expect(useSyncStatus.getState().failed).toBe(true);
});

test("startSync: an edit during a running sync is picked up straight afterwards", async () => {
  let finish: () => void = () => undefined;
  sync.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
  await start();
  useRooms.setState({ rooms: [room(true)] });
  await tick(2100); // fires while the first sync is still running
  expect(sync).toHaveBeenCalledTimes(1);
  finish();
  await tick(0);
  expect(sync).toHaveBeenCalledTimes(2);
});

test("startSync: stopping it stops everything", async () => {
  await start();
  sync.mockClear();
  stop();
  useRooms.setState({ rooms: [room(true)] });
  await tick(5000);
  expect(sync).not.toHaveBeenCalled();
  expect(removeListener).toHaveBeenCalledTimes(1); // the real app-state listener is gone too
});

test("useSync: does nothing while signed out", async () => {
  mockUserId = undefined;
  await renderHook(() => useSync());
  await tick(0);
  expect(sync).not.toHaveBeenCalled();
  mockUserId = "user-1";
});

test("useSync: starts when someone signs in", async () => {
  const { unmount } = await renderHook(() => useSync());
  await tick(0);
  expect(sync).toHaveBeenCalledTimes(1);
  await unmount();
});
