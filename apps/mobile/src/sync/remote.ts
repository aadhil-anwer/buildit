import { z } from "zod";
import { throwIfError } from "@/auth/auth";
import { report } from "@/lib/report";
import { supabase } from "@/lib/supabase";
import type { Remote } from "./sync";

const roomRow = z.object({ id: z.string(), name: z.string(), updated_at: z.string(), current: z.object({ scene: z.unknown() }).nullable() });
const versionRow = z.object({ id: z.string(), room_id: z.string(), label: z.string(), created_at: z.string(), scene: z.unknown() });
const walkway = z.union([z.literal(75), z.literal(90)]);

/** Versions people saved on purpose (a manual save or an AI result, with a name), newest first. */
async function listVersions() {
  const reply = await supabase.from("room_versions").select("id,room_id,label,created_at,scene").in("kind", ["manual", "ai"]).not("label", "is", null).order("created_at", { ascending: false }).limit(300);
  throwIfError(reply);
  return z.array(versionRow).parse(reply.data as unknown).map((v) => ({ id: v.id, roomId: v.room_id, label: v.label, createdAt: Date.parse(v.created_at), scene: v.scene }));
}

/** The real server. Every reply is checked before anything uses it; errors are raised, never swallowed. */
export function createRemote(userId: string): Remote {
  return {
    async createRoom(name, scene) {
      const reply = await supabase.rpc("create_room", { p_name: name, p_scene: scene });
      throwIfError(reply);
      return z.string().parse(reply.data as unknown);
    },
    async saveVersion(remoteId, scene, kind, label) {
      const reply = await supabase.rpc("save_version", { p_room_id: remoteId, p_scene: scene, p_kind: kind, p_label: label });
      throwIfError(reply);
      return z.string().parse(reply.data as unknown);
    },
    async deleteRoom(remoteId) {
      throwIfError(await supabase.rpc("delete_room", { p_room_id: remoteId }));
    },
    async renameRoom(remoteId, name) {
      throwIfError(await supabase.from("rooms").update({ name }).eq("id", remoteId));
    },
    listVersions,
    async listRooms() {
      const reply = await supabase.from("rooms").select("id,name,updated_at,current:room_versions!rooms_current_version_fk(scene)");
      throwIfError(reply);
      return z.array(roomRow).parse(reply.data as unknown).flatMap((r) => {
        if (r.current) return [{ id: r.id, name: r.name, updatedAt: Date.parse(r.updated_at), scene: r.current.scene }];
        report(new Error(`the server has no current version for room "${r.name}"`), { source: "sync" });
        return [];
      });
    },
    async getWalkway() {
      const reply = await supabase.from("profiles").select("walkway_pref_cm").maybeSingle();
      throwIfError(reply);
      return reply.data ? z.object({ walkway_pref_cm: walkway }).parse(reply.data).walkway_pref_cm : null;
    },
    async setWalkway(cm) {
      throwIfError(await supabase.from("profiles").update({ walkway_pref_cm: cm }).eq("id", userId));
    },
  };
}
