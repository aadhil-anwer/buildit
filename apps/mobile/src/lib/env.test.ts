import { parseEnv } from "./env";

const jwt = (role: string) => `h.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.s`;
const DSN = "https://key@o1.ingest.sentry.io/2";

test("accepts no DSN in development", () => expect(parseEnv({})).toEqual({ SENTRY_DSN: undefined }));
test("requires a DSN in production, so errors are never dropped", () =>
  expect(() => parseEnv({}, { production: true })).toThrow(/SENTRY_DSN/));
test("rejects a malformed DSN", () => expect(() => parseEnv({ SENTRY_DSN: "nope" })).toThrow(/SENTRY_DSN/));
test("accepts a valid DSN", () => expect(parseEnv({ SENTRY_DSN: DSN }).SENTRY_DSN).toBe(DSN));
test("rejects a service-role key in any variable", () =>
  expect(() => parseEnv({ SENTRY_DSN: DSN, ANYTHING: jwt("service_role") })).toThrow(/secret/));
test("rejects an Anthropic key in any variable", () =>
  expect(() => parseEnv({ SENTRY_DSN: DSN, ANYTHING: "sk-ant-abc" })).toThrow(/secret/));
test("allows an anon key", () => expect(() => parseEnv({ SENTRY_DSN: DSN, ANYTHING: jwt("anon") })).not.toThrow());
