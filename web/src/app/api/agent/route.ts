import { z } from "zod";
import { runAgent, type AgentEvent } from "@/agent/run";
import { sceneSchema } from "@/core/schema";
import type { Scene } from "@/core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  scene: sceneSchema,
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) }))
    .max(40)
    .default([]),
  selectedId: z.string().max(60).nullable().optional(),
});

const MAX_BODY_BYTES = 300_000;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json(
      { error: "AI is not configured on this server. Set ANTHROPIC_API_KEY (see .env.example). Manual editing still works." },
      { status: 503 },
    );
  }
  const code = process.env.AGENT_ACCESS_CODE;
  if (code && req.headers.get("x-access-code") !== code) {
    return Response.json({ error: "access_code_required" }, { status: 401 });
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "Request too large" }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid request", details: parsed.error.issues.slice(0, 5) }, { status: 400 });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: AgentEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(ev)}\n`));
      try {
        for await (const ev of runAgent({ ...parsed.data, scene: parsed.data.scene as Scene })) {
          if (req.signal.aborted) break;
          send(ev);
        }
      } catch (err) {
        console.error("agent failed", err);
        send({ type: "error", message: "Something went wrong while the AI was working. Your room was not changed." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
