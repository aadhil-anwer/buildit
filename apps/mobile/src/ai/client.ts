import type { Scene } from "@buildit/core";
import { fetch as streamingFetch } from "expo/fetch";
import { z } from "zod";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { parseEvents, type DesignerEvent } from "./sse";

export interface AskRequest {
  scene: Scene;
  message: string;
  history?: { role: "user" | "assistant"; text: string }[];
  selectedId?: string | null;
  /** For "show another option": the pieces the last answer changed. */
  avoid?: string[];
}

/** What the person is told when the request is refused before the designer runs; each has a next step in the UI. */
export type Refusal = { code: "limit"; resetsAt: Date } | { code: "email_required" | "unauthenticated" | "scene_too_large" | "bad_request" | "offline" | "unreachable" };

export type AskResult = { ok: true; events: AsyncGenerator<DesignerEvent> } | ({ ok: false } & Refusal);

const refusal = z.object({ code: z.string(), resetsAt: z.string().optional() });
const KNOWN = new Set(["email_required", "unauthenticated", "scene_too_large", "bad_request"]);

async function* textOf(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  for (let part = await reader.read(); !part.done; part = await reader.read()) yield decoder.decode(part.value, { stream: true });
}

/** Sends a request to the designer. A refusal comes back as data (so the UI can say what happens next); an unexpected failure throws. */
export async function askDesigner(req: AskRequest): Promise<AskResult> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { ok: false, code: "unauthenticated" };
  let res: Awaited<ReturnType<typeof streamingFetch>>;
  try {
    res = await streamingFetch(`${env.SUPABASE_URL}/functions/v1/agent`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify(req),
    });
  } catch {
    return { ok: false, code: "offline" };
  }
  if (res.ok && res.body) return { ok: true, events: parseEvents(textOf(res.body)) };
  const parsed = refusal.safeParse(await res.json().catch(() => null));
  if (parsed.success && parsed.data.code === "limit" && parsed.data.resetsAt) return { ok: false, code: "limit", resetsAt: new Date(parsed.data.resetsAt) };
  if (parsed.success && KNOWN.has(parsed.data.code)) return { ok: false, code: parsed.data.code as "email_required" };
  return { ok: false, code: "unreachable" };
}
