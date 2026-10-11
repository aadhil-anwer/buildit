import { supabase } from "@/lib/supabase";
import type { StringKey } from "@/i18n";

/** Throws Supabase's own error so no failure is hidden. */
export const throwIfError = (result: { error: Error | null }) => {
  if (result.error) throw result.error;
};

export const signInAnonymously = async () => throwIfError(await supabase.auth.signInAnonymously());
export const sendEmailCode = async (email: string) => throwIfError(await supabase.auth.signInWithOtp({ email }));
export const verifyEmailCode = async (email: string, token: string) => throwIfError(await supabase.auth.verifyOtp({ email, token, type: "email" }));
export const signOut = async () => throwIfError(await supabase.auth.signOut());

const KNOWN: Record<string, StringKey> = {
  otp_expired: "authBadCode",
  validation_failed: "authBadEmail",
  email_address_invalid: "authBadEmail",
  over_email_send_rate_limit: "authRate",
};

/** The message to show for failures a person can fix. Anything else returns undefined and must be rethrown. */
export function authErrorKey(error: unknown): StringKey | undefined {
  const e = error as { name?: string; code?: string; status?: number } | null;
  if (e?.name === "AuthRetryableFetchError") return "authOffline";
  return e?.code ? KNOWN[e.code] : undefined;
}
