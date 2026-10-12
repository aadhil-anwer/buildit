import type { Scene } from "@buildit/core";
import type { Remote, RemoteRoom, RemoteVersion } from "@/sync/sync";

interface State {
  rooms: Map<string, RemoteRoom>;
  versions: RemoteVersion[];
  calls: string[];
  n: number;
}

/** The room and version calls of the fake server, recording each in `calls`. */
function roomCalls(st: State): Pick<Remote, "createRoom" | "saveVersion" | "renameRoom" | "deleteRoom"> {
  return {
    createRoom: (name: string, scene: Scene) => {
      const id = `remote-${++st.n}`;
      st.rooms.set(id, { id, name, scene, updatedAt: Date.now() });
      st.calls.push(`create ${name}`);
      return Promise.resolve(id);
    },
    saveVersion: (id, scene, kind, label) => {
      const r = st.rooms.get(id);
      if (!r) return Promise.reject(new Error("room not found"));
      st.rooms.set(id, { ...r, scene, updatedAt: Date.now() });
      const versionId = `version-${++st.n}`;
      if (kind === "manual") st.versions.push({ id: versionId, roomId: id, label: label ?? "", createdAt: Date.now(), scene });
      st.calls.push(kind === "manual" ? `save ${id} "${label}"` : `save ${id}`);
      return Promise.resolve(versionId);
    },
    renameRoom: (id, name) => {
      const r = st.rooms.get(id);
      if (r) st.rooms.set(id, { ...r, name });
      st.calls.push(`rename ${id}`);
      return Promise.resolve();
    },
    deleteRoom: (id) => {
      st.calls.push(`delete ${id}`);
      return st.rooms.delete(id) ? Promise.resolve() : Promise.reject(new Error("room not found"));
    },
  };
}

/** An in-memory stand-in for the server: rooms with versions, and the profile's walkway. */
export function fakeRemote(initial: RemoteRoom[] = [], savedVersions: RemoteVersion[] = []) {
  const st: State = { rooms: new Map(initial.map((r) => [r.id, { ...r }])), versions: [...savedVersions], calls: [], n: 0 };
  let walkway: 75 | 90 | null = null;
  const remote: Remote = {
    ...roomCalls(st),
    listRooms: () => Promise.resolve([...st.rooms.values()]),
    listVersions: () => Promise.resolve([...st.versions].reverse()),
    getWalkway: () => Promise.resolve(walkway),
    setWalkway: (cm) => Promise.resolve(void (walkway = cm)),
  };
  return { remote, rooms: st.rooms, versions: st.versions, calls: st.calls, setWalkwayOnServer: (cm: 75 | 90) => (walkway = cm) };
}
