import { getObject } from "../scene";
import { layoutReport, summarizeScene } from "../summary";
import type { Scene } from "../types";
import { factChanges, measure, numbersAreMeasured, type FactChange, type Facts } from "./facts";
import { SYSTEM_PROMPT } from "./prompt";
import { executeTool, TOOL_DEFS, type ToolDef } from "./tools";

export interface ModelToolCall {
  id: string;
  name: string;
  input: unknown;
}

export type Message =
  | { role: "user"; text: string }
  | { role: "tool"; results: { id: string; content: string; isError: boolean }[] }
  | { role: "assistant"; text: string; toolCalls: ModelToolCall[] };

export interface ModelTurn {
  text: string;
  toolCalls: ModelToolCall[];
  stop: "end" | "tool_use" | "refusal" | "max_tokens";
}

/** The language model, as the loop needs it. The real one wraps the Anthropic API; tests use a scripted one. */
export interface AgentModel {
  turn: (args: { system: string; messages: Message[]; tools: ToolDef[] }) => Promise<ModelTurn>;
}

export interface AgentRequest {
  scene: Scene;
  message: string;
  history?: { role: "user" | "assistant"; text: string }[];
  selectedId?: string | null;
  /** For "show another option": ids of the pieces the last answer changed. The designer is asked for a different approach. */
  avoid?: string[];
}

export interface AgentStep {
  tool: string;
  ok: boolean;
  /** The engine's own sentence, in English. The app words the same change itself in the person's language. */
  summary: string;
}

/** How the finished room compares with the start. */
export type Verdict = "changed" | "unchanged" | "reverted";

export type AgentEvent =
  | { type: "step"; step: AgentStep; scene: Scene; changed: string[] }
  | { type: "text"; text: string }
  | {
      type: "done";
      /** The room to show: the result, or the original when it was reverted. */
      scene: Scene;
      steps: AgentStep[];
      verdict: Verdict;
      before: Facts;
      after: Facts;
      measured: FactChange[];
      /** The model's closing words, only when every number in them is one the engine measured. */
      reply: string | null;
    }
  | { type: "error"; code: "model_failed" | "refused" | "too_long"; message: string };

const MAX_TURNS = 12;
const MAX_HISTORY = 12;

function userMessage(req: AgentRequest): string {
  const summary = summarizeScene(req.scene, layoutReport(req.scene, 0.1));
  const selected = req.selectedId ? getObject(req.scene, req.selectedId) : undefined;
  return [`<room>\n${JSON.stringify(summary)}\n</room>`, selected ? `Selected object: ${selected.id} (${selected.name}).` : "No object is selected.", ...(req.avoid?.length ? [`The person asked for another option. The last answer changed: ${req.avoid.join(", ")}. Choose a different approach; do not repeat those moves.`] : []), `User: ${req.message.trim()}`].join("\n\n");
}

/** Earlier turns as alternating messages starting with the person's. */
function history(req: AgentRequest): Message[] {
  const out: Message[] = [];
  for (const turn of (req.history ?? []).slice(-MAX_HISTORY)) {
    const text = turn.text.trim().slice(0, 2000);
    const last = out[out.length - 1];
    if (!text || (!last && turn.role === "assistant")) continue;
    if (last && last.role === turn.role) (last as { text: string }).text += `\n\n${text}`;
    else out.push(turn.role === "user" ? { role: "user", text } : { role: "assistant", text, toolCalls: [] });
  }
  if (out[out.length - 1]?.role === "user") out.pop();
  return out;
}

/** One call to the model; a failure, refusal or cut-off becomes an error event instead of an exception. */
async function ask(model: AgentModel, messages: Message[]): Promise<ModelTurn | Extract<AgentEvent, { type: "error" }>> {
  let result: ModelTurn;
  try {
    result = await model.turn({ system: SYSTEM_PROMPT, messages, tools: TOOL_DEFS });
  } catch {
    return { type: "error", code: "model_failed", message: "The designer could not be reached." };
  }
  if (result.stop === "refusal") return { type: "error", code: "refused", message: "The designer can't help with that request." };
  if (result.stop === "max_tokens") return { type: "error", code: "too_long", message: "The designer ran out of room mid-action; nothing from that request was applied." };
  return result;
}

/** Runs the model's tool calls on the engine, in order; returns the room after them, what to tell the model, and the steps to show. */
function execute(scene: Scene, calls: ModelToolCall[]) {
  const results: { id: string; content: string; isError: boolean }[] = [];
  const shown: { step: AgentStep; scene: Scene; changed: string[] }[] = [];
  for (const c of calls) {
    const outcome = executeTool(scene, c.name, c.input);
    scene = outcome.scene;
    results.push({ id: c.id, content: outcome.content, isError: !outcome.ok });
    if (outcome.mutating || !outcome.ok) shown.push({ step: { tool: c.name, ok: outcome.ok, summary: outcome.summary }, scene, changed: outcome.changed });
  }
  return { scene, results, shown };
}

/** The closing event: the engine's before and after, and a revert when the AI added hard errors. */
function conclude(req: AgentRequest, scene: Scene, steps: AgentStep[], reply: string, before: Facts): Extract<AgentEvent, { type: "done" }> {
  const after = measure(scene);
  const reverted = after.errors > before.errors;
  const shown = reverted ? before : after;
  const verdict: Verdict = reverted ? "reverted" : steps.some((s) => s.ok) ? "changed" : "unchanged";
  const quotable = reply && numbersAreMeasured(reply, [before, after], req.message);
  return { type: "done", scene: reverted ? req.scene : scene, steps, verdict, before, after: shown, measured: factChanges(before, shown), reply: quotable ? reply : null };
}

/**
 * Runs the designer: the model asks for tools, the engine runs them, and at the end the engine measures the room before
 * and after. A result that adds hard errors (collisions, a blocked door) is reverted instead of shown. Never throws:
 * a failure ends the stream with an `error` event and nothing from the failed request applied.
 */
export async function* runAgent(model: AgentModel, req: AgentRequest): AsyncGenerator<AgentEvent> {
  const messages: Message[] = [...history(req), { role: "user", text: userMessage(req) }];
  const before = measure(req.scene);
  let scene = req.scene;
  const steps: AgentStep[] = [];
  let reply = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const result = await ask(model, messages);
    if ("type" in result) {
      yield result;
      return;
    }
    const text = result.text.trim();
    if (text) reply = text;
    if (text) yield { type: "text", text };
    if (!result.toolCalls.length) break;
    messages.push({ role: "assistant", text: result.text, toolCalls: result.toolCalls });
    const ran = execute(scene, result.toolCalls);
    scene = ran.scene;
    for (const s of ran.shown) {
      steps.push(s.step);
      yield { type: "step", ...s };
    }
    messages.push({ role: "tool", results: ran.results });
  }
  yield conclude(req, scene, steps, reply, before);
}
