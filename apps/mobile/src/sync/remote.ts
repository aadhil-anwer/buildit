import { z } from "zod";
import { throwIfError } from "@/auth/auth";
import { report } from "@/lib/report";
import { supabase } from "@/lib/supabase";
import type { Remote } from "./sync";

const roomRow = z.object({ id: z.string(), name: z.string(), updated_at: z.string(), current: z.object({ scene: z.unknown() }).nullable() });
const walkway = z.union([z.literal(75), z.literal(90)]);

/** The real server. Every reply is checked before anything uses it; errors are raised, never swallowed. */
export function createRemote(userId: string): Remote {
  return {
    async createRoom(name, scene) {
      const reply = await supabase.rpc("create_room", { p_name: name, p_scene: scene });
      throwIfError(reply);
      return z.string().parse(reply.data as unknown);
    },
    async saveVersion(remoteId, scene) {
      throwIfError(await supabase.rpc("save_version", { p_room_id: remoteId, p_scene: scene, p_kind: "autosave", p_label: null }));
    },
    async renameRoom(remoteId, name) {
      throwIfError(await supabase.from("rooms").update({ name }).eq("id", remoteId));
    },
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
