"use client";

import { create } from "zustand";
import { randomId } from "@/core/scene";
import { sampleLivingRoom } from "@/core/templates";
import type { Scene } from "@/core/types";
import * as H from "./history";
import { loadProject, saveProject, type ChatMessage, type Project } from "./persist";

export type ViewMode = "3d" | "top";

interface EditorState {
  projectId: string;
  history: H.History;
  /** What is drawn. Differs from the current version while dragging or while the AI works. */
  scene: Scene;
  selectedId: string | null;
  chat: ChatMessage[];
  aiBusy: boolean;
  aiStatus: string;
  view: ViewMode;
  showWalkways: boolean;
  dragging: boolean;
  /** Objects to briefly highlight after a change. */
  flash: { ids: string[]; at: number };
  toast: { text: string; at: number } | null;

  setLive: (scene: Scene) => void;
  commit: (scene: Scene, label: string, source?: H.Version["source"]) => void;
  revertLive: () => void;
  undo: () => void;
  redo: () => void;
  restore: (id: number) => void;
  select: (id: string | null) => void;
  setView: (v: ViewMode) => void;
  toggleWalkways: () => void;
  setDragging: (d: boolean) => void;
  flashIds: (ids: string[]) => void;
  showToast: (text: string) => void;
  setAi: (busy: boolean, status?: string) => void;
  pushChat: (m: ChatMessage) => void;
  updateChat: (id: string, patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) => void;
  openProject: (p: Project) => void;
  newProject: (scene: Scene, label?: string) => void;
}

function sceneOf(h: H.History): Scene {
  return H.currentVersion(h).scene;
}

const initialScene = sampleLivingRoom();
const initialHistory = H.initHistory(initialScene);

export const useEditor = create<EditorState>((set, get) => ({
  projectId: randomId(),
  history: initialHistory,
  scene: initialScene,
  selectedId: null,
  chat: [],
  aiBusy: false,
  aiStatus: "",
  view: "3d",
  showWalkways: false,
  dragging: false,
  flash: { ids: [], at: 0 },
  toast: null,

  setLive: (scene) => set({ scene }),
  commit: (scene, label, source = "user") => {
    const history = H.commit(get().history, scene, label, source);
    set({ history, scene });
  },
  revertLive: () => set({ scene: sceneOf(get().history) }),
  undo: () => {
    const { history, aiBusy } = get();
    if (aiBusy || !H.canUndo(history)) return;
    const label = H.currentVersion(history).label;
    const next = H.undo(history);
    set({ history: next, scene: sceneOf(next), toast: { text: `Undid: ${label}`, at: Date.now() } });
  },
  redo: () => {
    const { history, aiBusy } = get();
    const target = H.redoTarget(history);
    if (aiBusy || !target) return;
    const next = H.redo(history);
    set({ history: next, scene: sceneOf(next), toast: { text: `Redid: ${target.label}`, at: Date.now() } });
  },
  restore: (id) => {
    if (get().aiBusy) return;
    const next = H.restore(get().history, id);
    set({ history: next, scene: sceneOf(next) });
  },
  select: (selectedId) => set({ selectedId }),
  setView: (view) => set({ view }),
  toggleWalkways: () => set({ showWalkways: !get().showWalkways }),
  setDragging: (dragging) => set({ dragging }),
  flashIds: (ids) => {
    const at = Date.now();
    set({ flash: { ids, at } });
    setTimeout(() => {
      if (get().flash.at === at) set({ flash: { ids: [], at } });
    }, 2500);
  },
  showToast: (text) => set({ toast: { text, at: Date.now() } }),
  setAi: (aiBusy, aiStatus = "") => set({ aiBusy, aiStatus }),
  pushChat: (m) => set({ chat: [...get().chat, m] }),
  updateChat: (id, patch) =>
    set({
      chat: get().chat.map((m) => (m.id === id ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)),
    }),
  openProject: (p) =>
    set({
      projectId: p.id,
      history: p.history,
      scene: sceneOf(p.history),
      chat: p.chat,
      selectedId: null,
    }),
  newProject: (scene, label = "Original layout") => {
    const history = H.initHistory(scene, label);
    set({ projectId: randomId(), history, scene, chat: [], selectedId: null });
  },
}));

/** Save the open room whenever its history or chat changes (debounced). */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsub = useEditor.subscribe((s, prev) => {
    if (s.history === prev.history && s.chat === prev.chat && s.projectId === prev.projectId) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const st = useEditor.getState();
      saveProject({
        id: st.projectId,
        name: sceneOf(st.history).room.name,
        history: st.history,
        chat: st.chat,
        updatedAt: Date.now(),
      });
    }, 400);
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsub();
  };
}

export function reopen(id: string): boolean {
  const p = loadProject(id);
  if (!p) return false;
  useEditor.getState().openProject(p);
  return true;
}
