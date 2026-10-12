import type { OpResult, Scene } from "@buildit/core";
import { create } from "zustand";
import { useRooms } from "@/rooms/store";
import * as H from "./history";

/** The four tabs, plus the room check, which opens from its chip and is not a tab. */
export type EditorTab = "tAsk" | "tAdd" | "tItem" | "tFin" | "check";

interface State {
  roomId: string | null;
  history: H.History | null;
  selectedId: string | null;
  tab: EditorTab;
  /** Open a room: a fresh history and nothing selected. */
  open: (roomId: string, scene: Scene) => void;
  /** Apply an engine result. A refused one changes nothing and returns false, so the caller can say why. */
  commit: (result: OpResult) => boolean;
  /** Put a scene in as one undoable step (a finish, a wall length). */
  set: (scene: Scene) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string | null) => void;
  setTab: (tab: EditorTab) => void;
}

/** Every change is saved to the room straight away, so there is no save button and nothing to lose. */
const saved = (s: State, history: H.History): Partial<State> => {
  if (s.roomId) useRooms.getState().save(s.roomId, history.present);
  const selectedId = history.present.objects.some((o) => o.id === s.selectedId) ? s.selectedId : null;
  return { history, selectedId };
};

export const useEditor = create<State>()((set) => ({
  roomId: null,
  history: null,
  selectedId: null,
  tab: "tAsk",
  open: (roomId, scene) => set({ roomId, history: H.start(scene), selectedId: null, tab: "tAsk" }),
  commit: (result) => {
    if (result.ok) set((s) => (s.history ? saved(s, H.push(s.history, result.scene)) : s));
    return result.ok;
  },
  set: (scene) => set((s) => (s.history ? saved(s, H.push(s.history, scene)) : s)),
  undo: () => set((s) => (s.history ? saved(s, H.undo(s.history)) : s)),
  redo: () => set((s) => (s.history ? saved(s, H.redo(s.history)) : s)),
  select: (selectedId) => set((s) => ({ selectedId, tab: selectedId ? "tItem" : s.tab })),
  setTab: (tab) => set({ tab }),
}));

/** The scene being edited. Only valid while a room is open. */
export const useScene = () => useEditor((s) => s.history!.present);
export const useSelected = () => useEditor((s) => s.history?.present.objects.find((o) => o.id === s.selectedId));
