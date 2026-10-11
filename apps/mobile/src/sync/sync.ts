import { parseScene, randomId, type Scene } from "@buildit/core";
import { report } from "@/lib/report";
import { useRooms, type LocalRoom } from "@/rooms/store";
import { useSettings, type WalkwayCm } from "@/settings/store";

export interface RemoteRoom {
  id: string;
  name: string;
  scene: unknown;
  /** When the server last changed it (milliseconds). */
  updatedAt: number;
}

/** What sync needs from the server; src/sync/remote.ts is the real one. */
export interface Remote {
  createRoom: (name: string, scene: Scene) => Promise<string>;
  saveVersion: (remoteId: string, scene: Scene) => Promise<void>;
  renameRoom: (remoteId: string, name: string) => Promise<void>;
  listRooms: () => Promise<RemoteRoom[]>;
  getWalkway: () => Promise<WalkwayCm | null>;
  setWalkway: (cm: WalkwayCm) => Promise<void>;
}

const patch = (id: string, change: Partial<LocalRoom>) => useRooms.setState((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...change } : r)) }));
const isGone = (error: unknown) => /room not found/.test((error as { message?: string } | null)?.message ?? "");

/** Sends one room: a new version of an existing room, or a new room (also when the server says the old one is gone). */
async function send(remote: Remote, room: LocalRoom): Promise<string> {
  if (room.remoteId) {
    try {
      await remote.renameRoom(room.remoteId, room.name);
      await remote.saveVersion(room.remoteId, room.scene);
      return room.remoteId;
    } catch (error) {
      if (!isGone(error)) throw error;
    }
  }
  return remote.createRoom(room.name, room.scene);
}

async function push(remote: Remote) {
  for (const room of useRooms.getState().rooms.filter((r) => r.dirty)) {
    const remoteId = await send(remote, room);
    const now = useRooms.getState().rooms.find((r) => r.id === room.id);
    patch(room.id, { remoteId, dirty: now?.updatedAt !== room.updatedAt }); // edited while sending: stays dirty
  }
}

async function pull(remote: Remote) {
  const listed = await remote.listRooms();
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
      return [remote && !room.dirty && remote.updatedAt > room.updatedAt ? { ...room, name: remote.name, scene: remote.scene, updatedAt: remote.updatedAt } : room];
    });
    const known = new Set(s.rooms.map((r) => r.remoteId));
    const added = readable.filter((r) => !known.has(r.id)).map((r) => ({ id: randomId(), remoteId: r.id, name: r.name, scene: r.scene, updatedAt: r.updatedAt, dirty: false }));
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
