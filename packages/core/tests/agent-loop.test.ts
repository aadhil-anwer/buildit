import { describe, expect, test } from "vitest";
import { measure } from "../src/agent";
import { design } from "../src/design.generated";
import { sampleBedroom } from "../src/templates";
import { call, collect, finish, say, scriptedModel, use } from "./agent-helpers";

const bedroom = () => sampleBedroom();
const bedId = (s = bedroom()) => s.objects.find((o) => o.type === "bed")!.id;

describe("a request that works", () => {
  test("streams each change as a step, then a done event with the engine's before and after", async () => {
    const scene = bedroom();
    const { model } = scriptedModel([use(call("restyle_room", { style: "japan" })), say("Done: the room is warmer.")]);
    const events = await collect(model, { scene, message: "make it warmer" });
    expect(events.map((e) => e.type)).toEqual(["step", "text", "done"]);
    const done = finish(events)!;
    expect(done.verdict).toBe("changed");
    expect(done.scene.room.wallColor).toBe(design.styles.japan.wall);
    expect(done.before).toEqual(measure(scene));
    expect(done.after).toEqual(measure(done.scene));
    expect(done.reply).toBe("Done: the room is warmer.");
  });

  test("the model is shown the room as the engine describes it, with the design tips and the request", async () => {
    const { model, seen } = scriptedModel([say("Nothing to change.")]);
    await collect(model, { scene: bedroom(), message: "any ideas?" });
    const first = seen[0][0];
    expect(first.role === "user" && first.text).toContain("design_tips");
    expect(first.role === "user" && first.text).toContain("User: any ideas?");
  });

  test("tool results go back to the model, so it can react to a refusal", async () => {
    const scene = bedroom();
    const { model, seen } = scriptedModel([use(call("move_object", { object_id: bedId(scene), placement: { type: "against_wall", wall: "nowhere" } })), say("That wall does not exist.")]);
    const events = await collect(model, { scene, message: "move the bed" });
    const results = seen[1].find((m) => m.role === "tool");
    expect(results && "results" in results && results.results[0].isError).toBe(true);
    expect(finish(events)!.verdict).toBe("unchanged");
    expect(events.some((e) => e.type === "step" && !e.step.ok)).toBe(true);
  });
});

describe("the engine decides, not the model's words", () => {
  test("a reply that quotes a number the engine did not measure is not shown", async () => {
    const { model } = scriptedModel([use(call("restyle_room", { style: "japan" })), say("I made the walkway 137 cm wide.")]);
    expect(finish(await collect(model, { scene: bedroom(), message: "warmer" }))!.reply).toBeNull();
  });

  test("a reply that quotes only measured numbers, or the person's own, is shown", async () => {
    const scene = bedroom();
    const facts = measure(scene);
    const { model } = scriptedModel([use(call("restyle_room", { style: "scandi" })), say(`Score stays ${facts.score}. As you asked, 30 cm.`)]);
    expect(finish(await collect(model, { scene, message: "keep 30 cm clear" }))!.reply).toContain("Score stays");
  });

  test("a change that adds hard errors is reverted, and says so", async () => {
    const scene = bedroom();
    const { model } = scriptedModel([use(call("move_object", { object_id: bedId(scene), placement: { type: "against_wall", wall: "north" } })), say("Moved the bed north.")]);
    const done = finish(await collect(model, { scene, message: "bed against the north wall" }))!;
    expect(done.verdict).toBe("reverted");
    expect(done.scene).toBe(scene);
    expect(done.after).toEqual(done.before);
    expect(done.measured).toEqual([]);
  });

  test("a locked piece stays where it was", async () => {
    const scene = bedroom();
    const id = bedId(scene);
    const before = scene.objects.find((o) => o.id === id)!;
    const { model } = scriptedModel([use(call("lock_object", { object_id: id, locked: true })), use(call("move_object", { object_id: id, placement: { type: "against_wall", wall: "south" } })), say("It is locked.")]);
    const done = finish(await collect(model, { scene, message: "keep the bed, move it south" }))!;
    const after = done.scene.objects.find((o) => o.id === id)!;
    expect([after.x, after.z]).toEqual([before.x, before.z]);
  });
});

describe("failure is an event, never a crash", () => {
  test("a model that throws ends the stream with model_failed and applies nothing", async () => {
    const events = await collect({ turn: () => Promise.reject(new Error("offline")) }, { scene: bedroom(), message: "x" });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "error", code: "model_failed" });
  });

  test("a refusal or an over-long reply ends with its own code", async () => {
    const refusal = scriptedModel([{ text: "", toolCalls: [], stop: "refusal" }]);
    expect((await collect(refusal.model, { scene: bedroom(), message: "x" })).at(-1)).toMatchObject({ type: "error", code: "refused" });
    const long = scriptedModel([{ text: "", toolCalls: [call("restyle_room", { style: "japan" })], stop: "max_tokens" }]);
    expect((await collect(long.model, { scene: bedroom(), message: "x" })).at(-1)).toMatchObject({ type: "error", code: "too_long" });
  });

  test("a model that never stops calling tools is cut off after a few turns", async () => {
    const forever = scriptedModel(Array.from({ length: 30 }, () => use(call("get_layout_report", {}))));
    const done = finish(await collect(forever.model, { scene: bedroom(), message: "x" }))!;
    expect(done.verdict).toBe("unchanged");
    expect(forever.seen.length).toBeLessThanOrEqual(12);
  });
});

test("earlier turns are passed on as alternating messages starting with the person's", async () => {
  const { model, seen } = scriptedModel([say("ok")]);
  await collect(model, { scene: bedroom(), message: "now the rug", history: [{ role: "assistant", text: "stray" }, { role: "user", text: "move the bed" }, { role: "assistant", text: "Done." }] });
  expect(seen[0].map((m) => m.role)).toEqual(["user", "assistant", "user"]);
});

test("asking for another option tells the designer what the last answer changed and to try something else", async () => {
  const { model, seen } = scriptedModel([say("ok")]);
  await collect(model, { scene: bedroom(), message: "more space", avoid: ["bed_1", "desk_1"] });
  const first = seen[0][0];
  expect(first.role === "user" && first.text).toContain("another option");
  expect(first.role === "user" && first.text).toContain("bed_1, desk_1");
});
