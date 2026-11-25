import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Scene } from "@buildit/core";
import { Directory, File, Paths } from "expo-file-system";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";

/** A picture of a room in 3D, for its card on the Rooms list. `of` says which state of the room it shows. */
interface Snapshot {
  uri: string;
  of: string;
  /** The room check's score for that state (worked out once in the editor, so the list never runs the check). */
  score: number;
}

/** A short fingerprint of a room's state (FNV-1a over its JSON): a picture is shown only while the room still looks like it. */
export function sceneKey(scene: Scene): string {
  const s = JSON.stringify({ room: scene.room, objects: scene.objects });
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36) + s.length.toString(36);
}

interface State {
  shots: Record<string, Snapshot>;
  /** Keeps a picture taken by the canvas (a temporary file) as this room's card picture, replacing the old one. */
  keep: (roomId: string, shot: Snapshot) => Promise<void>;
  forget: (roomId: string) => void;
}

const folder = () => new Directory(Paths.document, "room-pictures");
const drop = (uri: string | undefined) => {
  const old = uri ? new File(uri) : null;
  if (old?.exists) old.delete();
};

const SAVED = z.record(z.string(), z.object({ uri: z.string().startsWith("file:"), of: z.string(), score: z.number().int().min(0).max(100) }));

export const useSnapshots = create<State>()(
  persist(
    (set, get) => ({
      shots: {},
      keep: async (roomId, { uri: tempUri, of, score }) => {
        const dir = folder();
        if (!dir.exists) dir.create({ intermediates: true });
        // A new name each time: the image cache keys on the address, so reusing one would show the old picture.
        const file = new File(dir, `${roomId}-${of}.jpg`);
        if (file.exists) file.delete();
        await new File(tempUri).move(file);
        drop(get().shots[roomId]?.uri);
        set((s) => ({ shots: { ...s.shots, [roomId]: { uri: file.uri, of, score } } }));
      },
      forget: (roomId) => {
        drop(get().shots[roomId]?.uri);
        set((s) => ({ shots: Object.fromEntries(Object.entries(s.shots).filter(([id]) => id !== roomId)) }));
      },
    }),
    {
      name: "room-pictures",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ shots: s.shots }),
      // Stored data is a boundary: anything malformed is dropped and the card shows the plan until a new picture is taken.
      merge: (saved, current) => ({ ...current, shots: SAVED.catch({}).parse((saved as { shots?: unknown } | undefined)?.shots) }),
    },
  ),
);
