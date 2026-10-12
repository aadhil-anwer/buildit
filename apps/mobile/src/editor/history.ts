import type { Scene } from "@buildit/core";

export interface History {
  past: Scene[];
  present: Scene;
  future: Scene[];
}

/** How many steps back undo can go. */
export const LIMIT = 50;

export const start = (scene: Scene): History => ({ past: [], present: scene, future: [] });

/** A new change: it becomes the present, the old present is undoable, and anything redoable is dropped. */
export const push = (h: History, scene: Scene): History =>
  scene === h.present ? h : { past: [...h.past, h.present].slice(-LIMIT), present: scene, future: [] };

export const undo = (h: History): History =>
  h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h;

export const redo = (h: History): History =>
  h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h;
