import { parseEnv } from "./env";

const jwt = (role: string) => `h.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.s`;
const DSN = "https://key@o1.ingest.sentry.io/2";
const BASE = { SUPABASE_URL: "http://127.0.0.1:54421", SUPABASE_ANON_KEY: jwt("anon"), SENTRY_DSN: DSN };

test("accepts a full, valid environment", () => expect(parseEnv(BASE)).toEqual(BASE));
test("a DSN is optional in development", () => expect(parseEnv({ ...BASE, SENTRY_DSN: undefined }).SENTRY_DSN).toBeUndefined());
test("requires a DSN in production, so errors are never dropped", () =>
  expect(() => parseEnv({ ...BASE, SENTRY_DSN: undefined }, { production: true })).toThrow(/SENTRY_DSN/));
test("rejects a malformed DSN", () => expect(() => parseEnv({ ...BASE, SENTRY_DSN: "nope" })).toThrow(/SENTRY_DSN/));
test.each(["SUPABASE_URL", "SUPABASE_ANON_KEY"])("%s is required, with a message that names it", (name) =>
  expect(() => parseEnv({ ...BASE, [name]: undefined })).toThrow(new RegExp(name)));
test("rejects a malformed Supabase URL", () => expect(() => parseEnv({ ...BASE, SUPABASE_URL: "nope" })).toThrow(/SUPABASE_URL/));
test("rejects a service-role key in any variable", () => expect(() => parseEnv({ ...BASE, ANYTHING: jwt("service_role") })).toThrow(/secret/));
test("rejects a service-role key even where the anon key belongs", () =>
  expect(() => parseEnv({ ...BASE, SUPABASE_ANON_KEY: jwt("service_role") })).toThrow(/secret/));
test("rejects an Anthropic key in any variable", () => expect(() => parseEnv({ ...BASE, ANYTHING: "sk-ant-abc" })).toThrow(/secret/));
test("rejects the new-style secret key", () => expect(() => parseEnv({ ...BASE, ANYTHING: "sb_secret_abc" })).toThrow(/secret/));
test("allows an anon key", () => expect(() => parseEnv({ ...BASE, ANYTHING: jwt("anon") })).not.toThrow());
