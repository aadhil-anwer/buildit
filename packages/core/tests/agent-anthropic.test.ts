import { describe, expect, test } from "vitest";
import { createAnthropicModel, fromApiReply, TOOL_DEFS, toApiMessages } from "../src/agent";

describe("messages to the API", () => {
  test("a person's turn, the model's tool call and the tool's result map to the API's shapes", () => {
    const api = toApiMessages([
      { role: "user", text: "make it warmer" },
      { role: "assistant", text: "On it.", toolCalls: [{ id: "t1", name: "restyle_room", input: { style: "japan" } }] },
      { role: "tool", results: [{ id: "t1", content: "Restyled.", isError: false }, { id: "t2", content: "FAILED", isError: true }] },
    ]);
    expect(api).toEqual([
      { role: "user", content: "make it warmer" },
      { role: "assistant", content: [{ type: "text", text: "On it." }, { type: "tool_use", id: "t1", name: "restyle_room", input: { style: "japan" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "Restyled." }, { type: "tool_result", tool_use_id: "t2", content: "FAILED", is_error: true }] },
    ]);
  });

  test("an assistant turn with no words sends no empty text block", () => {
    const [m] = toApiMessages([{ role: "assistant", text: "  ", toolCalls: [{ id: "t", name: "lock_object", input: {} }] }]);
    expect(m.content).toEqual([{ type: "tool_use", id: "t", name: "lock_object", input: {} }]);
  });
});

describe("the API's reply", () => {
  test("text and tool calls become one turn, with the stop reason", () => {
    const turn = fromApiReply({ content: [{ type: "text", text: "Moving it." }, { type: "tool_use", id: "t1", name: "move_object", input: { object_id: "bed_1" } }], stop_reason: "tool_use" });
    expect(turn).toEqual({ text: "Moving it.", toolCalls: [{ id: "t1", name: "move_object", input: { object_id: "bed_1" } }], stop: "tool_use" });
  });

  test("blocks we do not use (thinking) are ignored", () => {
    expect(fromApiReply({ content: [{ type: "thinking", thinking: "hmm" }, { type: "text", text: "Done." }], stop_reason: "end_turn" })).toMatchObject({ text: "Done.", stop: "end" });
  });

  test.each([["refusal", "refusal"], ["max_tokens", "max_tokens"], ["pause_turn", "tool_use"]])("stop reason %s is %s", (api, ours) => {
    expect(fromApiReply({ content: [], stop_reason: api }).stop).toBe(ours);
  });

  test("a reply in a shape we do not expect, or an unknown stop reason, throws so the loop reports a failure", () => {
    expect(() => fromApiReply({ nope: true })).toThrow();
    expect(() => fromApiReply({ content: [], stop_reason: "something_new" })).toThrow();
  });
});

describe("the model", () => {
  test("sends the system prompt (cacheable), every tool and the messages, and returns the parsed turn", async () => {
    let sent: Record<string, unknown> = {};
    const model = createAnthropicModel({ model: "claude-sonnet-5-5", post: (body) => ((sent = body), Promise.resolve({ content: [{ type: "text", text: "Hi" }], stop_reason: "end_turn" })) });
    const turn = await model.turn({ system: "SYS", messages: [{ role: "user", text: "hello" }], tools: TOOL_DEFS });
    expect(turn.text).toBe("Hi");
    expect(sent).toMatchObject({ model: "claude-sonnet-5-5", max_tokens: 4096, system: [{ type: "text", text: "SYS", cache_control: { type: "ephemeral" } }] });
    expect((sent.tools as unknown[]).length).toBe(TOOL_DEFS.length);
    expect(sent.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  test("a failed HTTP call rejects, which the loop turns into model_failed", async () => {
    const model = createAnthropicModel({ model: "m", post: () => Promise.reject(new Error("503")) });
    await expect(model.turn({ system: "", messages: [], tools: [] })).rejects.toThrow("503");
  });
});
