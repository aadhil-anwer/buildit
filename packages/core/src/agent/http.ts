import { z } from "zod";
import { parseScene } from "../schema";
import { runAgent, type AgentEvent, type AgentModel } from "./loop";

/** What the database said when asked to count one more request for this person. */
export type Consume =
  | { status: "ok"; remaining: number; limit: number }
  | { status: "limit"; limit: number; resetsAt: string }
  | { status: "email_required" }
  | { status: "unauthenticated" };

export interface AgentDeps {
  /** Counts one request against the signed-in person's daily cap (the `consume_ai_request` function). */
  consume: () => Promise<Consume>;
  model: AgentModel;
}

/** Either a refusal with a code the app turns into a state with a next step, or the stream of events. */
export type AgentResponse = { status: 400 | 401 | 403 | 413 | 429; body: { code: string; [key: string]: unknown } } | { status: 200; events: AsyncGenerator<AgentEvent> };

/** The biggest scene the function will read (bytes of JSON). A bigger one is rejected, not trimmed. */
export const MAX_SCENE_BYTES = 250_000;

const body = z.object({
  scene: z.unknown(),
  message: z.string().trim().min(1).max(1000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) })).max(12).optional(),
  selectedId: z.string().max(100).nullish(),
});

/**
 * One designer request. Order matters: a bad request is refused before it costs the person anything, then the daily cap
 * is checked in the database, then the model runs on the engine. A guest login (no email) is told to add one.
 */
export async function handleAgent(raw: unknown, deps: AgentDeps): Promise<AgentResponse> {
  const parsed = body.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { code: "bad_request" } };
  if (JSON.stringify(parsed.data.scene ?? null).length > MAX_SCENE_BYTES) return { status: 413, body: { code: "scene_too_large" } };
  const scene = parseScene(parsed.data.scene);
  if (!scene) return { status: 400, body: { code: "bad_scene" } };

  const cap = await deps.consume();
  if (cap.status === "unauthenticated") return { status: 401, body: { code: "unauthenticated" } };
  if (cap.status === "email_required") return { status: 403, body: { code: "email_required" } };
  if (cap.status === "limit") return { status: 429, body: { code: "limit", limit: cap.limit, resetsAt: cap.resetsAt } };
  return { status: 200, events: runAgent(deps.model, { scene, message: parsed.data.message, history: parsed.data.history, selectedId: parsed.data.selectedId }) };
}
