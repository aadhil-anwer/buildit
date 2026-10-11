import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { env } from "./env";
import { report } from "./report";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

// Refresh the login only while the app is on screen.
AppState.addEventListener("change", (state) => {
  (state === "active" ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()).catch(report);
});
