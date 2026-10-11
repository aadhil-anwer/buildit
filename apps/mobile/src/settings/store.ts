import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WalkwayCm = 75 | 90;

interface State {
  /** The narrowest walkway the room check treats as comfortable. */
  walkwayCm: WalkwayCm;
  /** Changed here and not yet sent to the server. */
  walkwayDirty: boolean;
  setWalkway: (cm: WalkwayCm) => void;
}

export const useSettings = create<State>()(
  persist((set) => ({ walkwayCm: 90, walkwayDirty: false, setWalkway: (walkwayCm) => set({ walkwayCm, walkwayDirty: true }) }), {
    name: "settings",
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (s) => ({ walkwayCm: s.walkwayCm, walkwayDirty: s.walkwayDirty }),
    // Only 75 and 90 are allowed (the database enforces the same); anything else in storage is ignored.
    merge: (saved, current) => {
      const { walkwayCm: cm, walkwayDirty } = (saved ?? {}) as { walkwayCm?: unknown; walkwayDirty?: unknown };
      return cm === 75 || cm === 90 ? { ...current, walkwayCm: cm, walkwayDirty: walkwayDirty === true } : current;
    },
  }),
);
