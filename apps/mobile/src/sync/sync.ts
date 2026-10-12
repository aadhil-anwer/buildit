import { parseScene, randomId, type Scene } from "@buildit/core";
import { report } from "@/lib/report";
import { t } from "@/i18n";
import { useRooms, type LocalRoom, type LocalVersion } from "@/rooms/store";
import { useSettings, type WalkwayCm } from "@/settings/store";

export interface RemoteRoom {
  id: string;
  name: string;
  scene: unknown;
  /** When the server last changed it (milliseconds). */
  updatedAt: number;
}

export interface RemoteVersion {
  id: string;
  roomId: string;
  label: string;
  createdAt: number;
  scene: unknown;
}

/** What sync needs from the server; src/sync/remote.ts is the real one. */
export interface Remote {
  createRoom: (name: string, scene: Scene) => Promise<string>;
  /** A new version of a room: an autosave of the latest scene, or a named one the person saved on purpose. Returns the version's id. */
  saveVersion: (remoteId: string, scene: Scene, kind: "autosave" | "manual", label: string | null) => Promise<string>;
  renameRoom: (remoteId: string, name: string) => Promise<void>;
  deleteRoom: (remoteId: string) => Promise<void>;
  listRooms: () => Promise<RemoteRoom[]>;
  /** Versions people saved on purpose, newest first. */
  listVersions: () => Promise<RemoteVersion[]>;
  getWalkway: () => Promise<WalkwayCm | null>;
  setWalkway: (cm: WalkwayCm) => Promise<void>;
}

const patch = (id: string, change: Partial<LocalRoom>) => useRooms.setState((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...change } : r)) }));
const isGone = (error: unknown) => /room not found/.test((error as { message?: string } | null)?.message ?? "");

/**
 * Sends one room to `remoteId`, or creates it when there is none: the room's name, then the versions saved on purpose
 * (oldest first), then the latest scene as the current version again if a saved one (an older scene) was the last thing sent.
 * Returns the server ids of the versions it sent.
 */
async function attempt(remote: Remote, room: LocalRoom, existing: string | undefined) {
  const remoteId = existing ?? (await remote.createRoom(room.name, room.scene));
  if (existing) await remote.renameRoom(existing, room.name);
  const sent = new Map<string, string>();
  let held: Scene | undefined = existing ? undefined : room.scene; // what the server holds as current
  for (const v of (room.versions ?? []).filter((v) => !existing || !v.remoteId)) {
    sent.set(v.id, await remote.saveVersion(remoteId, v.scene, "manual", v.label ?? t("verSaveLabel")));
    held = v.scene;
  }
  if (held !== room.scene) await remote.saveVersion(remoteId, room.scene, "autosave", null);
  return { remoteId, sent };
}

/** Sends one room; if the server says it is gone, creates it again (with all its saved versions, since the old ones went with it). */
async function send(remote: Remote, room: LocalRoom) {
  try {
    return await attempt(remote, room, room.remoteId);
  } catch (error) {
    if (!room.remoteId || !isGone(error)) throw error;
    return attempt(remote, room, undefined);
  }
}

/** Deletes on the server the rooms deleted here. A room the server no longer has counts as deleted. */
async function pushDeletes(remote: Remote) {
  for (const remoteId of useRooms.getState().deleted) {
    try {
      await remote.deleteRoom(remoteId);
    } catch (error) {
      if (!isGone(error)) throw error;
    }
    useRooms.setState((s) => ({ deleted: s.deleted.filter((id) => id !== remoteId) }));
  }
}

const unsent = (r: LocalRoom) => r.dirty || (r.versions ?? []).some((v) => !v.remoteId);

async function push(remote: Remote) {
  await pushDeletes(remote);
  for (const room of useRooms.getState().rooms.filter(unsent)) {
    const { remoteId, sent } = await send(remote, room);
    const now = useRooms.getState().rooms.find((r) => r.id === room.id);
    const versions = now?.versions?.map((v) => (sent.has(v.id) ? { ...v, remoteId: sent.get(v.id) } : v));
    patch(room.id, { remoteId, versions, dirty: now?.updatedAt !== room.updatedAt || (now?.versions ?? []).some((v) => !v.remoteId && !sent.has(v.id)) }); // edited while sending: stays dirty
  }
}

const MAX_VERSIONS = 30;

/** Versions from the server that parse, grouped by their room's server id, oldest first. */
function readVersions(list: RemoteVersion[]): Map<string, LocalVersion[]> {
  const byRoom = new Map<string, LocalVersion[]>();
  for (const v of [...list].sort((a, b) => a.createdAt - b.createdAt)) {
    const scene = parseScene(v.scene);
    if (!scene) {
      report(new Error(`skipped an unreadable saved version "${v.label}" from the server`), { source: "sync" });
      continue;
    }
    byRoom.set(v.roomId, [...(byRoom.get(v.roomId) ?? []), { id: randomId(), remoteId: v.id, label: v.label, scene, createdAt: v.createdAt }]);
  }
  return byRoom;
}

/** The room with any server versions it did not have yet; the newest 30 are kept. */
function withVersions(room: LocalRoom, incoming: LocalVersion[] = []): LocalRoom {
  const have = new Set((room.versions ?? []).map((v) => v.remoteId));
  const fresh = incoming.filter((v) => !have.has(v.remoteId));
  return fresh.length ? { ...room, versions: [...(room.versions ?? []), ...fresh].sort((a, b) => a.createdAt - b.createdAt).slice(-MAX_VERSIONS) } : room;
}

async function pull(remote: Remote) {
  const [listed, versions] = [await remote.listRooms(), readVersions(await remote.listVersions())];
  const exists = new Set(listed.map((r) => r.id));
  const readable = listed.flatMap((r) => {
    const scene = parseScene(r.scene);
    if (scene) return [{ ...r, scene }];
    report(new Error(`skipped an unreadable room "${r.name}" from the server`), { source: "sync" });
    return [];
  });
  const byId = new Map(readable.map((r) => [r.id, r]));
  useRooms.setState((s) => {
    const kept = s.rooms.flatMap((room) => {
      if (!room.remoteId) return [room];
      if (!exists.has(room.remoteId)) return room.dirty ? [{ ...room, remoteId: undefined }] : []; // deleted elsewhere
      const remote = byId.get(room.remoteId);
      const next = remote && !room.dirty && remote.updatedAt > room.updatedAt ? { ...room, name: remote.name, scene: remote.scene, updatedAt: remote.updatedAt } : room;
      return [withVersions(next, versions.get(room.remoteId))];
    });
    const known = new Set(s.rooms.map((r) => r.remoteId));
    const added = readable.filter((r) => !known.has(r.id)).map((r) => withVersions({ id: randomId(), remoteId: r.id, name: r.name, scene: r.scene, updatedAt: r.updatedAt, dirty: false }, versions.get(r.id)));
    return { rooms: [...kept, ...added] };
  });
}

async function syncWalkway(remote: Remote) {
  const { walkwayCm, walkwayDirty } = useSettings.getState();
  if (walkwayDirty) {
    await remote.setWalkway(walkwayCm);
    if (useSettings.getState().walkwayCm === walkwayCm) useSettings.setState({ walkwayDirty: false });
    return;
  }
  const server = await remote.getWalkway();
  if (server && server !== walkwayCm) useSettings.setState({ walkwayCm: server });
}

/**
 * Sends what changed here, then takes what changed elsewhere. Every save is a new version on the server,
 * so "the last writer wins" never destroys anything. Throws on the first failure; what was not sent stays dirty.
 */
export async function syncOnce(remote: Remote) {
  await push(remote);
  await pull(remote);
  await syncWalkway(remote);
}
