import { addEssentialSteps, furnishSteps, type FurnishResult, type FurnitureType, type OpResult, type RoomKind } from "@buildit/core";
import { create } from "zustand";
import { getCatalogItem } from "@buildit/core";
import { useToast } from "@/components/toast";
import { t } from "@/i18n";
import { haptic } from "@/lib/haptics";
import { typeName } from "@/rooms/names";
import { useEditor } from "./store";

/** How long each piece takes to arrive in the reveal; the compute runs first, so the pace is steady. */
const REVEAL_MS = 420;
const SLICE_MS = 8;
const frame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs an engine generator in slices, pausing for a frame every few milliseconds so the screen keeps moving. */
export async function runSliced<Y, R>(gen: Generator<Y, R>, onYield?: (value: Y) => void): Promise<R> {
  let start = Date.now();
  for (let step = gen.next(); ; step = gen.next()) {
    if (step.done) return step.value;
    onYield?.(step.value);
    if (Date.now() - start >= SLICE_MS) {
      await frame();
      start = Date.now();
    }
  }
}

type Phase = { name: "idle" } | { name: "placing"; placed: number } | { name: "revealing" };

interface State {
  phase: Phase;
  /** Set while the furnishing itself commits, so "room complete" isn't announced twice. */
  quiet: boolean;
  /** A furnishing is about to start by itself (the room was created with a kind): don't ask what the room is. */
  pending: boolean;
  setPending: (pending: boolean) => void;
  furnish: (kind: RoomKind) => Promise<void>;
  addEssential: (kind: RoomKind, type: FurnitureType) => Promise<void>;
}

async function reveal(result: FurnishResult) {
  for (const scene of result.frames) {
    useEditor.getState().setPreview(scene);
    haptic.land();
    await wait(REVEAL_MS);
  }
}

function announce(result: FurnishResult) {
  const missed = result.skipped.map((id) => getCatalogItem(id)).filter(Boolean).map((item) => typeName(item!.type));
  if (!result.added.length) return useToast.getState().show(t("furnishNone"));
  haptic.win();
  useToast.getState().show(missed.length ? `${t("furnishDone")} ${t("furnishSkipped", missed.join(", "))}` : t("furnishDone"));
}

/** "Furnish it for me": place the set (sliced, narrated), then show the pieces arriving one by one, then keep it as one undoable step. */
export const useFurnish = create<State>()((set, get) => ({
  phase: { name: "idle" },
  quiet: false,
  pending: false,
  setPending: (pending) => set({ pending }),
  furnish: async (kind) => {
    const editor = useEditor.getState();
    if (get().phase.name !== "idle" || !editor.history) return;
    haptic.pick();
    set({ phase: { name: "placing", placed: 0 }, pending: false });
    try {
      const result = await runSliced(furnishSteps(editor.history.present, kind), (s) => s && set({ phase: { name: "placing", placed: (get().phase as { placed: number }).placed + 1 } }));
      set({ phase: { name: "revealing" } });
      await reveal(result);
      set({ quiet: true });
      useEditor.getState().setPreview(null);
      useEditor.getState().commit({ scene: result.scene, ok: result.added.length > 0, message: "", changed: result.added });
      announce(result);
    } finally {
      useEditor.getState().setPreview(null);
      set({ phase: { name: "idle" }, quiet: false });
    }
  },
  addEssential: async (kind, type) => {
    const editor = useEditor.getState();
    if (get().phase.name !== "idle" || !editor.history) return;
    const res: OpResult | null = await runSliced(addEssentialSteps(editor.history.present, kind, type));
    if (res && useEditor.getState().commit(res)) return haptic.land();
    useToast.getState().show(t("essentialNoFit", typeName(type)));
  },
}));
