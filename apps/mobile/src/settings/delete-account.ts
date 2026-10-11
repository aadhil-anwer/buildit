import { throwIfError } from "@/auth/auth";
import { supabase } from "@/lib/supabase";
import { useRooms } from "@/rooms/store";
import { useSettings } from "./store";

/** Deletes the account on the server; only once that succeeds is this device wiped and signed out. */
export async function deleteAccount() {
  throwIfError(await supabase.rpc("delete_account"));
  useRooms.setState({ rooms: [] });
  useSettings.setState({ walkwayCm: 90 });
  throwIfError(await supabase.auth.signOut({ scope: "local" }));
}
