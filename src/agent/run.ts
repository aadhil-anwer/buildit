import Anthropic from "@anthropic-ai/sdk";
import type { Scene } from "@/core/types";
import { layoutReport, summarizeScene } from "@/core/summary";
import { getObject } from "@/core/scene";
import { SYSTEM_PROMPT } from "./prompt";
import { MUTATING, TOOLS, executeTool, type ToolName } from "./tools";

export const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_TURNS = 20;
/** Models that accept server-side refusal fallbacks in "default" mode. */
const DEFAULT_FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AgentRequest {
  scene: Scene;
  message: string;
  history: ChatTurn[];
  selectedId?: string | null;
}

export interface AgentStep {
  tool: string;
  ok: boolean;
  summary: string;
}

export type AgentEvent =
  | { type: "status"; text: string }
  | { type: "step"; step: AgentStep; scene: Scene; changed: string[] }
  | { type: "text"; text: string }
  | { type: "done"; scene: Scene; steps: AgentStep[] }
  | { type: "error"; message: string };

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

function effort(): Effort {
  const e = process.env.AGENT_EFFORT;
  return e === "low" || e === "medium" || e === "high" || e === "xhigh" || e === "max" ? e : "medium";
}

/** Previous turns as plain text; the API needs alternating roles starting with user. */
function historyMessages(history: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const turn of history.slice(-12)) {
    const text = turn.text.trim().slice(0, 2000);
    if (!text) continue;
    const last = out[out.length - 1];
    if (!last && turn.role === "assistant") continue;
    if (last && last.role === turn.role) {
      last.content = `${last.content as string}\n\n${text}`;
    } else {
      out.push({ role: turn.role, content: text });
    }
  }
  if (out.length && out[out.length - 1].role === "user") out.pop();
  return out;
}

function userMessage(req: AgentRequest): string {
  const summary = summarizeScene(req.scene, layoutReport(req.scene, 0.1));
  const selected = req.selectedId ? getObject(req.scene, req.selectedId) : undefined;
  return [
    `<room>\n${JSON.stringify(summary)}\n</room>`,
    selected ? `Selected object: ${selected.id} (${selected.name}).` : "No object is selected.",
    `User: ${req.message.trim()}`,
  ].join("\n\n");
}

export async function* runAgent(req: AgentRequest, client = new Anthropic()): AsyncGenerator<AgentEvent> {
  const model = process.env.AGENT_MODEL || DEFAULT_MODEL;
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...historyMessages(req.history),
    { role: "user", content: userMessage(req) },
  ];
  let scene = req.scene;
  const steps: AgentStep[] = [];
  let jsonRetries = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    yield { type: "status", text: turn === 0 ? "Thinking…" : "Checking the result…" };
    let message: Anthropic.Beta.BetaMessage;
    try {
      const stream = client.beta.messages.stream({
        model,
        max_tokens: 16000,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: TOOLS,
        messages,
        thinking: { type: "adaptive" },
        output_config: { effort: effort() },
        ...(DEFAULT_FALLBACK_MODELS.has(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        yield { type: "error", message: apiErrorMessage(err) };
        return;
      }
      // With eager input streaming a malformed tool input can fail to parse;
      // re-issue the turn a couple of times before giving up.
      if (jsonRetries++ < 2) continue;
      yield { type: "error", message: "The AI produced an unreadable response. Please try again." };
      return;
    }

    if (message.stop_reason === "refusal") {
      yield { type: "text", text: "I can't help with that request." };
      break;
    }

    for (const block of message.content) {
      if (block.type === "text" && block.text.trim()) yield { type: "text", text: block.text.trim() };
    }

    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!toolUses.length) break;
    if (message.stop_reason === "max_tokens") {
      yield { type: "error", message: "The AI ran out of room mid-action; nothing from that step was applied." };
      break;
    }

    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const outcome = executeTool(scene, use.name, use.input);
      scene = outcome.scene;
      results.push({ type: "tool_result", tool_use_id: use.id, content: outcome.content, ...(outcome.ok ? {} : { is_error: true }) });
      if (MUTATING.has(use.name as ToolName) || !outcome.ok) {
        const step = { tool: use.name, ok: outcome.ok, summary: outcome.summary };
        steps.push(step);
        yield { type: "step", step, scene, changed: outcome.changed };
      }
    }
    messages.push({ role: "user", content: results });
  }

  yield { type: "done", scene, steps };
}

function apiErrorMessage(err: InstanceType<typeof Anthropic.APIError>): string {
  if (err instanceof Anthropic.AuthenticationError) return "The AI service rejected the API key. Check ANTHROPIC_API_KEY on the server.";
  if (err instanceof Anthropic.RateLimitError) return "The AI service is busy (rate limited). Try again in a moment.";
  if (err instanceof Anthropic.BadRequestError) return `The AI request was rejected: ${err.message}`;
  return `The AI service failed (${err.status ?? "network"}). Try again.`;
}
