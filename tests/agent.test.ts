import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test } from "vitest";
import { runAgent, type AgentEvent } from "@/agent/run";
import { SYSTEM_PROMPT } from "@/agent/prompt";
import { TOOLS, executeTool } from "@/agent/tools";
import { findGeometryIssues } from "@/core/layout/validate";
import { getObject } from "@/core/scene";
import { sampleLivingRoom } from "@/core/templates";

type FakeResponse = Pick<Anthropic.Beta.BetaMessage, "content" | "stop_reason">;

function fakeClient(responses: FakeResponse[]) {
  const calls: Anthropic.Beta.MessageCreateParams[] = [];
  const client = {
    beta: {
      messages: {
        stream(params: Anthropic.Beta.MessageCreateParams) {
          // Copy: the agent keeps appending to the same array.
          calls.push(structuredClone(params));
          const next = responses.shift();
          if (!next) throw new Error("no more fake responses");
          return { finalMessage: async () => next };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

async function collect(gen: AsyncGenerator<AgentEvent>) {
  const events: AgentEvent[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

describe("tools", () => {
  test("every tool has an object input schema and a description", () => {
    for (const t of TOOLS) {
      expect(t.input_schema.type).toBe("object");
      expect(t.description?.length).toBeGreaterThan(10);
    }
    const move = TOOLS.find((t) => t.name === "move_object")!;
    expect(JSON.stringify(move.input_schema)).toContain("against_wall");
  });

  test("invalid input is reported, not executed", () => {
    const s = sampleLivingRoom();
    const out = executeTool(s, "move_object", { object_id: "sofa_1", placement: { type: "teleport" } });
    expect(out.ok).toBe(false);
    expect(out.content).toMatch(/Invalid input/);
    expect(out.scene).toBe(s);
  });

  test("tool results include the layout status", () => {
    const out = executeTool(sampleLivingRoom(), "move_object", {
      object_id: "sofa_1",
      placement: { type: "near", target: "center" },
    });
    expect(out.ok).toBe(true);
    expect(out.content).toMatch(/Layout now: \d+ error/);
  });

  test("system prompt lists the catalog", () => {
    expect(SYSTEM_PROMPT).toContain("sofa_3_seat");
    expect(SYSTEM_PROMPT).toContain("dining_chair");
  });
});

describe("agent loop", () => {
  test("runs tool calls, streams steps and finishes", async () => {
    const { client, calls } = fakeClient([
      {
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "t1", name: "lock_object", input: { object_id: "tv_unit_1", locked: true }, caller: { type: "direct" } },
          {
            type: "tool_use",
            id: "t2",
            name: "apply_layout",
            input: {
              steps: [
                { object_id: "sofa_1", placement: { type: "next_to", target: "tv_unit_1", side: "front", facing: "toward_target" } },
                { object_id: "coffee_table_1", placement: { type: "next_to", target: "sofa_1", side: "front" } },
                { object_id: "side_table_1", placement: { type: "next_to", target: "sofa_1", side: "left" } },
              ],
            },
            caller: { type: "direct" },
          },
        ] as Anthropic.Beta.BetaContentBlock[],
      },
      {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "Sofa now faces the TV.", citations: null }] as Anthropic.Beta.BetaContentBlock[],
      },
    ]);
    const scene = sampleLivingRoom();
    const events = await collect(runAgent({ scene, message: "Face the sofa to the TV", history: [] }, client));

    const steps = events.filter((e) => e.type === "step");
    expect(steps).toHaveLength(2);
    const done = events.find((e) => e.type === "done");
    expect(done?.type).toBe("done");
    if (done?.type !== "done") return;
    expect(getObject(done.scene, "tv_unit_1")?.locked).toBe(true);
    const sofa = getObject(done.scene, "sofa_1")!;
    expect(sofa.rotation).toBe(90); // faces the TV on the east wall
    expect(findGeometryIssues(done.scene).filter((i) => i.severity === "error")).toHaveLength(0);
    expect(events.some((e) => e.type === "text" && e.text.includes("faces the TV"))).toBe(true);

    // All tool results go back in one user message, matched by id.
    const second = calls[1].messages;
    const results = second[second.length - 1];
    expect(results.role).toBe("user");
    const ids = (results.content as Anthropic.Beta.BetaToolResultBlockParam[]).map((r) => r.tool_use_id);
    expect(ids).toEqual(["t1", "t2"]);
    // The room summary rides on the first user message.
    expect(JSON.stringify(calls[0].messages[0].content)).toContain("<room>");
  });

  test("a failed tool is returned as an error the model can react to", async () => {
    const { client, calls } = fakeClient([
      {
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "t1", name: "move_object", input: { object_id: "nope", placement: { type: "near", target: "center" } }, caller: { type: "direct" } },
        ] as Anthropic.Beta.BetaContentBlock[],
      },
      { stop_reason: "end_turn", content: [{ type: "text", text: "That object doesn't exist.", citations: null }] as Anthropic.Beta.BetaContentBlock[] },
    ]);
    const events = await collect(runAgent({ scene: sampleLivingRoom(), message: "move it", history: [] }, client));
    const result = (calls[1].messages.at(-1)!.content as Anthropic.Beta.BetaToolResultBlockParam[])[0];
    expect(result.is_error).toBe(true);
    expect(events.find((e) => e.type === "step")).toMatchObject({ step: { ok: false } });
  });

  test("history is trimmed to alternating text turns", async () => {
    const { client, calls } = fakeClient([
      { stop_reason: "end_turn", content: [{ type: "text", text: "ok", citations: null }] as Anthropic.Beta.BetaContentBlock[] },
    ]);
    await collect(
      runAgent(
        {
          scene: sampleLivingRoom(),
          message: "and now?",
          history: [
            { role: "assistant", text: "welcome" },
            { role: "user", text: "make it cosy" },
            { role: "assistant", text: "done" },
            { role: "user", text: "dangling" },
          ],
        },
        client,
      ),
    );
    const roles = calls[0].messages.map((m) => m.role);
    expect(roles).toEqual(["user", "assistant", "user"]);
  });
});

test("an impossible move explains itself", () => {
  // The side table and bookshelf leave less than 2.2 m along the west wall.
  const out = executeTool(sampleLivingRoom(), "move_object", {
    object_id: "sofa_1",
    placement: { type: "against_wall", wall: "west" },
  });
  expect(out.ok).toBe(false);
  expect(out.content).toMatch(/^FAILED: Could not move sofa_1: .*overlap|blocks|fit/);
});
