import { z } from "zod";
import type { AgentModel, Message, ModelTurn } from "./loop";
import type { ToolDef } from "./tools";

/**
 * The Claude Messages API as an AgentModel. Sends the system prompt and the tools, maps our messages to the API's, and
 * reads the reply with zod. The actual HTTP call is injected (`post`), so this has no network or Deno code in it.
 */
export interface AnthropicOptions {
  /** Sends the request body to the Messages API and returns the parsed JSON reply. Throws on a network or HTTP error. */
  post: (body: Record<string, unknown>) => Promise<unknown>;
  model: string;
  maxTokens?: number;
}

const block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("tool_use"), id: z.string(), name: z.string(), input: z.unknown() }),
]);
const reply = z.object({ content: z.array(z.union([block, z.object({ type: z.string() }).passthrough()])), stop_reason: z.string().nullable() });

type ApiMessage = { role: "user" | "assistant"; content: string | Record<string, unknown>[] };

/** Our messages as the API's: tool results go back as a user message of tool_result blocks. */
export function toApiMessages(messages: Message[]): ApiMessage[] {
  return messages.map((m): ApiMessage => {
    if (m.role === "user") return { role: "user", content: m.text };
    if (m.role === "tool") return { role: "user", content: m.results.map((r) => ({ type: "tool_result", tool_use_id: r.id, content: r.content, ...(r.isError ? { is_error: true } : {}) })) };
    return { role: "assistant", content: [...(m.text.trim() ? [{ type: "text", text: m.text }] : []), ...m.toolCalls.map((c) => ({ type: "tool_use", id: c.id, name: c.name, input: c.input }))] };
  });
}

const STOPS: Record<string, ModelTurn["stop"]> = { end_turn: "end", stop_sequence: "end", tool_use: "tool_use", pause_turn: "tool_use", refusal: "refusal", max_tokens: "max_tokens" };

/** The API's reply as one turn. A reply that is not in the shape we expect throws, so the loop reports a failure. */
export function fromApiReply(raw: unknown): ModelTurn {
  const parsed = reply.parse(raw);
  const known = parsed.content.flatMap((b) => (b.type === "text" || b.type === "tool_use" ? [block.parse(b)] : []));
  const stop = STOPS[parsed.stop_reason ?? "end_turn"];
  if (!stop) throw new Error(`unknown stop reason "${String(parsed.stop_reason)}"`);
  return {
    text: known.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n"),
    toolCalls: known.flatMap((b) => (b.type === "tool_use" ? [{ id: b.id, name: b.name, input: b.input }] : [])),
    stop,
  };
}

const apiTools = (tools: ToolDef[]) => tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));

export function createAnthropicModel({ post, model, maxTokens = 4096 }: AnthropicOptions): AgentModel {
  return {
    turn: async ({ system, messages, tools }) =>
      fromApiReply(await post({ model, max_tokens: maxTokens, system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }], tools: apiTools(tools), messages: toApiMessages(messages) })),
  };
}
