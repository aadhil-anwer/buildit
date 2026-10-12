import { sampleBedroom } from "@buildit/core";
import { fetch as streamingFetch } from "expo/fetch";
import { askDesigner } from "./client";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));
const mockGetSession = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: (): unknown => mockGetSession() } } }));
const getSession = mockGetSession;
const fetchMock = jest.mocked(streamingFetch);
const req = { scene: sampleBedroom(), message: "warmer" };
const reply = (status: number, body: unknown) => ({ ok: status === 200, status, body: null, json: () => Promise.resolve(body) }) as unknown as Awaited<ReturnType<typeof streamingFetch>>;

beforeEach(() => getSession.mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null }));

test("signed out: no request is made", async () => {
  getSession.mockResolvedValue({ data: { session: null }, error: null });
  expect(await askDesigner(req)).toEqual({ ok: false, code: "unauthenticated" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("the request goes to the agent with the person's own login", async () => {
  fetchMock.mockResolvedValue(reply(400, { code: "bad_request" }));
  await askDesigner(req);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url as string).toMatch(/\/functions\/v1\/agent$/);
  expect((init?.headers as Record<string, string>).authorization).toBe("Bearer tok");
  expect(JSON.parse(init?.body as string)).toMatchObject({ message: "warmer" });
});

test.each([["email_required", 403], ["unauthenticated", 401], ["scene_too_large", 413], ["bad_request", 400]])("a %s refusal comes back as data", async (code, status) => {
  fetchMock.mockResolvedValue(reply(status, { code }));
  expect(await askDesigner(req)).toEqual({ ok: false, code });
});

test("the daily limit comes back with when it resets", async () => {
  fetchMock.mockResolvedValue(reply(429, { code: "limit", limit: 20, resetsAt: "2026-10-13T00:00:00Z" }));
  expect(await askDesigner(req)).toEqual({ ok: false, code: "limit", resetsAt: new Date("2026-10-13T00:00:00Z") });
});

test("no network is 'offline'; an answer nobody understands is 'unreachable'", async () => {
  fetchMock.mockRejectedValue(new Error("Network request failed"));
  expect(await askDesigner(req)).toEqual({ ok: false, code: "offline" });
  fetchMock.mockResolvedValue(reply(502, "<html>"));
  expect(await askDesigner(req)).toEqual({ ok: false, code: "unreachable" });
});
