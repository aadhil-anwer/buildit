import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseScene, randomId, type Scene } from "@buildit/core";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { report } from "@/lib/report";

/** A named copy of a room's scene, kept on this phone. */
export interface LocalVersion {
  id: string;
  label: string | null;
  scene: Scene;
  createdAt: number;
}

/** How many saved versions a room keeps; the oldest go first. */
const MAX_VERSIONS = 30;

export interface LocalRoom {
  id: string;
  /** The room's id on the server once it has been synced. */
  remoteId?: string;
  name: string;
  scene: Scene;
  updatedAt: number;
  /** Changed here and not yet sent to the server. */
  dirty: boolean;
  /** Versions saved on purpose, oldest first. They stay on this phone: they are not synced yet. */
  versions?: LocalVersion[];
}

interface State {
  rooms: LocalRoom[];
  /** The account these rooms belong to, so a different account never sees them. */
  owner: string | null;
  /** Called on sign-in: a different account than before starts with no rooms; the same one keeps them. */
  claim: (userId: string) => void;
  add: (name: string, scene: Scene) => string;
  save: (id: string, scene: Scene) => void;
  rename: (id: string, name: string) => void;
  /** Keep the room's scene as it is now under a name (or none). Does not count as a change to sync. */
  saveVersion: (id: string, label: string | null) => void;
  remove: (id: string) => void;
}

const storedVersion = z.object({ id: z.string(), label: z.string().nullable(), scene: z.unknown(), createdAt: z.number() });
const stored = z.object({ id: z.string(), remoteId: z.string().optional(), name: z.string(), scene: z.unknown(), updatedAt: z.number(), dirty: z.boolean(), versions: z.array(z.unknown()).optional() });

/** Saved versions read back from storage; one that cannot be read is dropped and reported. */
function validVersions(raw: unknown[] | undefined): LocalVersion[] | undefined {
  return raw?.flatMap((item) => {
    const v = storedVersion.safeParse(item);
    const scene = v.success ? parseScene(v.data.scene) : null;
    if (v.success && scene) return [{ ...v.data, scene }];
    report(new Error("dropped an unreadable saved version"), { source: "rooms-store" });
    return [];
  });
}

/** Everything read back from storage is checked; what cannot be trusted is dropped and reported, never guessed at. */
function validRooms(raw: unknown): LocalRoom[] {
  const list = z.array(z.unknown()).safeParse(raw);
  if (!list.success) {
    report(new Error("stored rooms are not a list"), { source: "rooms-store" });
    return [];
  }
  return list.data.flatMap((item) => {
    const room = stored.safeParse(item);
    const scene = room.success ? parseScene(room.data.scene) : null;
    if (room.success && scene) return [{ ...room.data, scene, versions: validVersions(room.data.versions) }];
    report(new Error(`dropped an unreadable stored room "${(item as { name?: string } | null)?.name ?? "?"}"`), { source: "rooms-store" });
    return [];
  });
}

const touch = (id: string, patch: Partial<LocalRoom>) => (s: State) => ({
  rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now(), dirty: true } : r)),
});

export const useRooms = create<State>()(
  persist(
    (set) => ({
      rooms: [],
      owner: null,
      claim: (userId) => set((s) => (s.owner && s.owner !== userId ? { rooms: [], owner: userId } : { owner: userId })),
      add: (name, scene) => {
        const id = randomId();
        set((s) => ({ rooms: [{ id, name, scene, updatedAt: Date.now(), dirty: true }, ...s.rooms] }));
        return id;
      },
      save: (id, scene) => set(touch(id, { scene })),
      rename: (id, name) => set(touch(id, { name })),
      saveVersion: (id, label) =>
        set((s) => ({
          rooms: s.rooms.map((r) => (r.id === id ? { ...r, versions: [...(r.versions ?? []), { id: randomId(), label, scene: r.scene, createdAt: Date.now() }].slice(-MAX_VERSIONS) } : r)),
        })),
      remove: (id) => set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) })),
    }),
    {
      name: "rooms",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ rooms: s.rooms, owner: s.owner }),
      merge: (saved, current) => {
        const { rooms, owner } = (saved ?? {}) as { rooms?: unknown; owner?: unknown };
        return rooms === undefined ? current : { ...current, rooms: validRooms(rooms), owner: typeof owner === "string" ? owner : null };
      },
    },
  ),
);

/** False until the saved rooms have been read from the device. */
export function useRoomsReady() {
  const [ready, setReady] = useState(useRooms.persist.hasHydrated());
  useEffect(() => useRooms.persist.onFinishHydration(() => setReady(true)), []);
  return ready;
}
