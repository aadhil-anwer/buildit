import { z } from "zod";

/** The `role` claim of a JWT, or undefined when the value is not a JWT. */
const roleOf = (v: string) => {
  try {
    return (JSON.parse(atob(v.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string }).role;
  } catch {
    return undefined; // not a JWT, so it has no role
  }
};
const isSecret = (v: string) => v.startsWith("sk-") || v.startsWith("sb_secret_") || roleOf(v) === "service_role";

/**
 * `production` requires a crash-report DSN: a store build must not fail silently. A preview build
 * (EXPO_PUBLIC_BUILD=preview: a test APK handed to a few people before Sentry is set up) may go without one, on purpose.
 */
export function parseEnv(raw: Record<string, string | undefined>, { production = false } = {}) {
  const leaked = Object.entries(raw).find(([, v]) => v && isSecret(v));
  if (leaked) throw new Error(`${leaked[0]} looks like a secret and must never ship in the app`);
  // An empty value (e.g. a blank line copied from .env.example) means "not set".
  const set = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === "" ? undefined : v]));
  return z
    .object({
      SUPABASE_URL: z.url(),
      SUPABASE_ANON_KEY: z.string().min(1),
      SENTRY_DSN: production && set.BUILD !== "preview" ? z.url() : z.url().optional(),
      BUILD: z.enum(["preview"]).optional(),
    })
    .parse(set);
}

// Expo only inlines static `process.env.EXPO_PUBLIC_*` references, so list each one.
export const env = parseEnv(
  {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined,
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN as string | undefined,
    BUILD: process.env.EXPO_PUBLIC_BUILD as string | undefined,
  },
  { production: !__DEV__ },
);
