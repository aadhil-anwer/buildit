import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type HintId = "editorMove" | "roomDelete";

interface State {
  seen: Partial<Record<HintId, true>>;
  see: (id: HintId) => void;
}

/** One-time tips: each is shown until the person has seen it once, then never again. */
export const useHints = create<State>()(
  persist((set) => ({ seen: {}, see: (id) => set((s) => ({ seen: { ...s.seen, [id]: true } })) }), {
    name: "hints",
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (s) => ({ seen: s.seen }),
    merge: (saved, current) => {
      const seen = (saved as { seen?: Record<string, unknown> } | undefined)?.seen ?? {};
      return { ...current, seen: { editorMove: seen.editorMove === true ? (true as const) : undefined, roomDelete: seen.roomDelete === true ? (true as const) : undefined } };
    },
  }),
);
