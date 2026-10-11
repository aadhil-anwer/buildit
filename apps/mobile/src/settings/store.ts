import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WalkwayCm = 75 | 90;

interface State {
  /** The narrowest walkway the room check treats as comfortable. */
  walkwayCm: WalkwayCm;
  setWalkway: (cm: WalkwayCm) => void;
}

export const useSettings = create<State>()(
  persist((set) => ({ walkwayCm: 90, setWalkway: (walkwayCm) => set({ walkwayCm }) }), {
    name: "settings",
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (s) => ({ walkwayCm: s.walkwayCm }),
    // Only 75 and 90 are allowed (the database enforces the same); anything else in storage is ignored.
    merge: (saved, current) => {
      const cm = (saved as { walkwayCm?: unknown } | undefined)?.walkwayCm;
      return cm === 75 || cm === 90 ? { ...current, walkwayCm: cm } : current;
    },
  }),
);
