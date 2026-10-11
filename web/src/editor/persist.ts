import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { parseScene } from "@/core/schema";
import type { Scene } from "@/core/types";
import type { History } from "./history";

/**
 * Local persistence. Rooms live in this browser's localStorage; a share
 * link carries the whole room in the URL fragment, so nothing is uploaded.
 * Every access is wrapped: storage can be full, blocked or unavailable.
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  steps?: { tool: string; ok: boolean; summary: string }[];
  /** Version to go back to if the user undoes this AI change. */
  versionBefore?: number;
  versionAfter?: number;
  error?: boolean;
  /** The request that produced this reply (for "try another"). */
  request?: string;
}

export interface Project {
  id: string;
  name: string;
  history: History;
  chat: ChatMessage[];
  updatedAt: number;
}

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
}

const INDEX_KEY = "buildit:index";
const LAST_KEY = "buildit:last";
const projectKey = (id: string) => `buildit:project:${id}`;

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function listProjects(): ProjectMeta[] {
  return (read<ProjectMeta[]>(INDEX_KEY) ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveProject(p: Project): boolean {
  const slim: Project = { ...p, chat: p.chat.slice(-60) };
  if (!write(projectKey(p.id), slim)) {
    // Out of space: keep fewer versions and try once more.
    const h = p.history;
    const keep = h.versions.slice(-20);
    const ids = new Set(keep.map((v) => v.id));
    const trimmed = {
      ...slim,
      history: {
        current: ids.has(h.current) ? h.current : keep[keep.length - 1].id,
        versions: keep.map((v) => (v.parent !== null && !ids.has(v.parent) ? { ...v, parent: null } : v)),
      },
    };
    if (!write(projectKey(p.id), trimmed)) return false;
  }
  const index = listProjects().filter((m) => m.id !== p.id);
  index.unshift({ id: p.id, name: p.name, updatedAt: p.updatedAt });
  write(INDEX_KEY, index.slice(0, 50));
  write(LAST_KEY, p.id);
  return true;
}

export function loadProject(id: string): Project | null {
  const p = read<Project>(projectKey(id));
  if (!p || !p.history?.versions?.length) return null;
  // Drop versions that no longer parse (e.g. older formats).
  const versions = p.history.versions.filter((v) => parseScene(v.scene));
  if (!versions.length) return null;
  const current = versions.some((v) => v.id === p.history.current) ? p.history.current : versions[versions.length - 1].id;
  return { ...p, history: { versions, current }, chat: p.chat ?? [] };
}

export function lastProjectId(): string | null {
  return read<string>(LAST_KEY);
}

export function deleteProject(id: string) {
  try {
    window.localStorage.removeItem(projectKey(id));
  } catch {
    /* ignore */
  }
  write(INDEX_KEY, listProjects().filter((m) => m.id !== id));
}

const SHARE_PREFIX = "#room=";

export function shareUrl(scene: Scene): string {
  const data = compressToEncodedURIComponent(JSON.stringify(scene));
  return `${window.location.origin}${window.location.pathname}${SHARE_PREFIX}${data}`;
}

export function sceneFromHash(hash: string): Scene | null {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  try {
    const json = decompressFromEncodedURIComponent(hash.slice(SHARE_PREFIX.length));
    return json ? parseScene(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}

export function encodeSceneForTest(scene: Scene): string {
  return SHARE_PREFIX + compressToEncodedURIComponent(JSON.stringify(scene));
}
