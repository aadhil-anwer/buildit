import { z } from "zod";

/** The `role` claim of a JWT, or undefined when the value is not a JWT. */
const roleOf = (v: string) => {
  try {
    return (JSON.parse(atob(v.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string }).role;
  } catch {
    return undefined; // not a JWT, so it has no role
  }
};

export function parseEnv(raw: Record<string, string | undefined>, { production = false } = {}) {
  const leaked = Object.entries(raw).find(([, v]) => v && (v.startsWith("sk-") || roleOf(v) === "service_role"));
  if (leaked) throw new Error(`${leaked[0]} looks like a secret and must never ship in the app`);
  return z.object({ SENTRY_DSN: production ? z.url() : z.url().optional() }).parse(raw);
}

// Expo only inlines static `process.env.EXPO_PUBLIC_*` references, so list each one.
export const env = parseEnv({ SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN as string | undefined }, { production: !__DEV__ });
