import AsyncStorage from "@react-native-async-storage/async-storage";
import { arrangeSteps, samePoses, TRADITIONS, type Arrangement, type Compass, type TraditionId } from "@buildit/core";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { useToast } from "@/components/toast";
import { t } from "@/i18n";
import { haptic } from "@/lib/haptics";
import { runSliced } from "./furnish-store";
import { useEditor } from "./store";

type Phase = { name: "idle" } | { name: "arranging"; doing: TraditionId } | { name: "ready" };
/** A tradition whose layout came out the same as the room now (as: null) or as an earlier card: said in a line, not shown twice. */
export interface Same { tradition: TraditionId; as: TraditionId | null }

interface State {
  phase: Phase;
  layouts: Arrangement[];
  same: Same[];
  /** The card being looked at: -1 is the room as it is. */
  active: number;
  /** Which wall faces Mecca, per room, if the person said. Kept on this phone. */
  qibla: Record<string, Compass>;
  open: () => Promise<void>;
  look: (index: number) => void;
  use: (index: number) => void;
  close: () => void;
  setQibla: (wall: Compass) => Promise<void>;
}

/** The chosen layout becomes the room, as one undoable step. */
function keep(a: Arrangement) {
  useEditor.getState().setPreview(null);
  useEditor.getState().commit({ scene: a.scene, ok: true, message: "", changed: a.moved });
  haptic.win();
  useToast.getState().show(t("layoutsUsed"));
}

const ctxFor = (s: State) => ({ qibla: s.qibla[useEditor.getState().roomId ?? ""] });

/** Adds a finished layout as a card, or, if it matches the room or a card already there, as a "same as" line. */
function add(s: State, a: Arrangement): Partial<State> {
  if (!a.moved.length) return { same: [...s.same, { tradition: a.tradition, as: null }] };
  const twin = s.layouts.find((b) => samePoses(a.scene, b.scene));
  return twin ? { same: [...s.same, { tradition: a.tradition, as: twin.tradition }] } : { layouts: [...s.layouts, a] };
}
/** A new Gulf layout (after the Qibla wall is picked) replaces the old one; it is the last card, so the others keep their order. */
const withGulf = (s: State, gulf: Arrangement) => add({ ...s, layouts: s.layouts.filter((a) => a.tradition !== "arabian"), same: s.same.filter((x) => x.tradition !== "arabian") }, gulf);
/** Bumped by every open and close: a run that is no longer the latest stops adding cards (the pane can remount mid-run). */
let runId = 0;
const EMPTY = { layouts: [], same: [], active: -1 };
const IDLE = { phase: { name: "idle" } as Phase, ...EMPTY };

/** "Other layouts": every tradition's arrangement of this room, looked at one by one (pieces glide), one kept as an undoable step. */
export const useLayouts = create<State>()(
  persist(
    (set, get) => ({
      ...IDLE,
      qibla: {},
      open: async () => {
        const present = useEditor.getState().history?.present;
        if (!present || get().phase.name === "arranging") return;
        const me = ++runId;
        set({ phase: { name: "arranging", doing: TRADITIONS[0] }, ...EMPTY });
        for (const doing of TRADITIONS) {
          // One at a time, each card shown as soon as it is ready: the first appears in a few seconds, not after all five.
          set({ phase: { name: "arranging", doing } });
          const a = await runSliced(arrangeSteps(present, doing, ctxFor(get())));
          if (runId !== me) return; // closed, or opened again, while working
          if (a) set((s) => add(s, a));
        }
        set({ phase: { name: "ready" } });
      },
      look: (index) => {
        const a = get().layouts[index];
        haptic.pick();
        set({ active: a ? index : -1 });
        useEditor.getState().setPreview(a ? a.scene : null);
      },
      use: (index) => {
        const a = get().layouts[index];
        if (a) { keep(a); set(IDLE); }
      },
      close: () => {
        runId++;
        // Idle: nothing of ours is showing (and a designer's preview must not be cleared).
        if (get().phase.name !== "idle") { useEditor.getState().setPreview(null); set(IDLE); }
      },
      setQibla: async (wall) => {
        const roomId = useEditor.getState().roomId;
        const present = useEditor.getState().history?.present;
        if (!roomId || !present) return;
        set((s) => ({ qibla: { ...s.qibla, [roomId]: wall } }));
        const gulf = await runSliced(arrangeSteps(present, "arabian", ctxFor(get())));
        if (gulf) set((s) => withGulf(s, gulf));
      },
    }),
    {
      name: "layouts",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ qibla: s.qibla }),
      // Stored data is a boundary: anything that isn't a map of rooms to compass points is dropped (the person picks again).
      merge: (saved, current) => ({ ...current, qibla: z.record(z.string(), z.enum(["north", "south", "east", "west"])).catch({}).parse((saved as { qibla?: unknown } | undefined)?.qibla) }),
    },
  ),
);
