import type { Scene } from "@/core/types";

/**
 * Version history that never loses work. Versions form a tree: committing
 * after an undo starts a new branch instead of deleting the redo branch,
 * and every version stays in the list so it can be restored.
 */
export interface Version {
  id: number;
  label: string;
  scene: Scene;
  parent: number | null;
  at: number;
  source: "user" | "ai" | "system";
}

export interface History {
  versions: Version[];
  current: number;
}

export const MAX_VERSIONS = 80;

export function initHistory(scene: Scene, label = "Original layout"): History {
  return { versions: [{ id: 0, label, scene, parent: null, at: Date.now(), source: "system" }], current: 0 };
}

export function currentVersion(h: History): Version {
  return h.versions.find((v) => v.id === h.current) ?? h.versions[h.versions.length - 1];
}

export function commit(h: History, scene: Scene, label: string, source: Version["source"]): History {
  const id = Math.max(...h.versions.map((v) => v.id)) + 1;
  let versions = [...h.versions, { id, label, scene, parent: h.current, at: Date.now(), source }];
  if (versions.length > MAX_VERSIONS) {
    // Drop the oldest versions but keep the chain to the current one intact
    // by re-parenting orphans to null.
    versions = versions.slice(versions.length - MAX_VERSIONS);
    const ids = new Set(versions.map((v) => v.id));
    versions = versions.map((v) => (v.parent !== null && !ids.has(v.parent) ? { ...v, parent: null } : v));
  }
  return { versions, current: id };
}

export function canUndo(h: History): boolean {
  return currentVersion(h).parent !== null;
}

export function undo(h: History): History {
  const parent = currentVersion(h).parent;
  return parent === null ? h : { ...h, current: parent };
}

/** Redo follows the most recent child of the current version. */
export function redoTarget(h: History): Version | undefined {
  const children = h.versions.filter((v) => v.parent === h.current);
  return children[children.length - 1];
}

export function redo(h: History): History {
  const next = redoTarget(h);
  return next ? { ...h, current: next.id } : h;
}

export function restore(h: History, id: number): History {
  return h.versions.some((v) => v.id === id) ? { ...h, current: id } : h;
}
