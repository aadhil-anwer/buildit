import { describe, expect, test } from "vitest";
import { handleAgent, MAX_SCENE_BYTES, type AgentDeps, type Consume } from "../src/agent";
import { sampleBedroom } from "../src/templates";
import { call, finish, say, scriptedModel, use } from "./agent-helpers";

const deps = (cap: Consume, turns = [use(call("restyle_room", { style: "japan" })), say("Done.")]): AgentDeps & { charged: () => number } => {
  let charged = 0;
  return { consume: () => Promise.resolve((charged++, cap)), model: scriptedModel(turns).model, charged: () => charged };
};
const ok: Consume = { status: "ok", remaining: 19, limit: 20 };
const request = (over: Record<string, unknown> = {}) => ({ scene: sampleBedroom(), message: "make it warmer", ...over });

describe("a good request", () => {
  test("is counted once and streams the designer's events", async () => {
    const d = deps(ok);
    const res = await handleAgent(request(), d);
    expect(res.status).toBe(200);
    const events = [];
    if (res.status === 200) for await (const e of res.events) events.push(e);
    expect(finish(events)?.verdict).toBe("changed");
    expect(d.charged()).toBe(1);
  });
});

describe("a request that must not cost anything", () => {
  test.each([
    ["no message", { message: "  " }],
    ["a message over 1000 characters", { message: "x".repeat(1001) }],
    ["a scene that is not a scene", { scene: { version: 1, nonsense: true } }],
    ["no scene", { scene: undefined }],
    ["too much history", { history: Array.from({ length: 13 }, () => ({ role: "user", text: "hi" })) }],
  ])("%s is refused as a bad request, uncounted", async (_name, over) => {
    const d = deps(ok);
    const res = await handleAgent(request(over), d);
    expect(res.status).toBe(400);
    expect(d.charged()).toBe(0);
  });

  test("an oversized scene is refused, not trimmed, and uncounted", async () => {
    const d = deps(ok);
    const scene = { ...sampleBedroom(), id: "x".repeat(MAX_SCENE_BYTES) };
    const res = await handleAgent(request({ scene }), d);
    expect(res).toMatchObject({ status: 413, body: { code: "scene_too_large" } });
    expect(d.charged()).toBe(0);
  });
});

describe("what the daily cap says", () => {
  test("over the limit: 429 with when it resets, and the model is never called", async () => {
    const turns = scriptedModel([]);
    let called = false;
    const res = await handleAgent(request(), { consume: () => Promise.resolve({ status: "limit", limit: 20, resetsAt: "2026-10-13T00:00:00Z" }), model: { turn: (a) => ((called = true), turns.model.turn(a)) } });
    expect(res).toEqual({ status: 429, body: { code: "limit", limit: 20, resetsAt: "2026-10-13T00:00:00Z" } });
    expect(called).toBe(false);
  });

  test("a guest login is told an email is needed (403); a signed-out caller gets 401", async () => {
    expect(await handleAgent(request(), deps({ status: "email_required" }))).toMatchObject({ status: 403, body: { code: "email_required" } });
    expect(await handleAgent(request(), deps({ status: "unauthenticated" }))).toMatchObject({ status: 401, body: { code: "unauthenticated" } });
  });
});
