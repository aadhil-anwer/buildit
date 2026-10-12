import { useEffect } from "react";
import { AppState } from "react-native";
import { create } from "zustand";
import { useSession } from "@/auth/session";
import { report } from "@/lib/report";
import { useRooms } from "@/rooms/store";
import { useSettings } from "@/settings/store";
import { createRemote } from "./remote";
import { syncOnce, type Remote } from "./sync";

const SETTLE_MS = 2000;
const RETRY_MS = 30_000;

/** True after a sync failed, until one succeeds again. Rooms are safe on the phone meanwhile. */
export const useSyncStatus = create<{ failed: boolean }>(() => ({ failed: false }));

const isOffline = (error: unknown) => /failed to fetch|network request failed|networkerror|load failed/i.test(String((error as { message?: string } | null)?.message ?? error));
/** Changes still to send: edited rooms, saved versions, rooms deleted here, the walkway preference. */
const hasUnsent = () => {
  const { rooms, deleted } = useRooms.getState();
  return rooms.some((r) => r.dirty || r.versions?.some((v) => !v.remoteId)) || deleted.length > 0 || useSettings.getState().walkwayDirty;
};

/** Runs one sync at a time. A request that arrives mid-sync is remembered and run straight after; a failure retries in 30 s. */
function createRunner(remote: Remote) {
  let running = false;
  let again = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const run = async (): Promise<void> => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    clearTimeout(retry);
    try {
      await syncOnce(remote);
      useSyncStatus.setState({ failed: false });
    } catch (error) {
      useSyncStatus.setState({ failed: true });
      if (!isOffline(error)) report(error, { source: "sync" });
      retry = setTimeout(() => void run(), RETRY_MS);
    } finally {
      running = false;
      if (again) {
        again = false;
        void run();
      }
    }
  };
  return { run, cancel: () => clearTimeout(retry) };
}

/**
 * Keeps this phone and the server in step for one signed-in account: now, shortly after unsent changes,
 * and when the app comes back to the front. Returns a function that stops it.
 */
export function startSync(userId: string) {
  useRooms.getState().claim(userId);
  const runner = createRunner(createRemote(userId));
  let settle: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (!hasUnsent()) return; // what sync itself writes is not a reason to sync again
    clearTimeout(settle);
    settle = setTimeout(() => void runner.run(), SETTLE_MS);
  };
  void runner.run();
  const stops = [useRooms.subscribe(schedule), useSettings.subscribe(schedule)];
  const app = AppState.addEventListener("change", (state) => state === "active" && void runner.run());
  return () => {
    clearTimeout(settle);
    runner.cancel();
    stops.forEach((stop) => stop());
    app.remove();
  };
}

/** Runs sync for as long as someone is signed in. */
export function useSync() {
  const userId = useSession()?.user.id;
  useEffect(() => (userId ? startSync(userId) : undefined), [userId]);
}
