// The AI designer's endpoint. All the logic is in packages/core (bundled into ./core.js by `npm run agent:bundle`);
// this file only connects it to Deno: sign-in check, the daily cap in the database, and the Claude API.
// It calls the database AS THE SIGNED-IN PERSON (their own Authorization header and the public anon key, over the plain REST API). There is no
// service-role key here, so there is no new service-role call site.
import { createAnthropicModel, handleAgent } from "./core.js";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "access-control-allow-methods": "POST, OPTIONS" };
const json = (body: unknown, status: number) => Response.json(body, { status, headers: CORS });

/** Counts one request for the caller through `consume_ai_request` and says what the database answered. */
function consumeFor(authorization: string | null) {
  return async () => {
    if (!authorization) return { status: "unauthenticated" as const };
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/consume_ai_request`, {
      method: "POST",
      headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, authorization, "content-type": "application/json" },
      body: "{}",
    });
    const data = (await res.json()) as { code?: string; message?: string } | { allowed: boolean; remaining: number; daily_limit: number; resets_at: string }[];
    if (!res.ok) {
      const error = data as { code?: string; message?: string };
      if (/email required/i.test(error.message ?? "")) return { status: "email_required" as const };
      if (res.status === 401 || error.code === "28000" || error.code === "42501") return { status: "unauthenticated" as const };
      throw new Error(error.message ?? `database ${res.status}`);
    }
    const row = (data as { allowed: boolean; remaining: number; daily_limit: number; resets_at: string }[])[0];
    return row.allowed ? { status: "ok" as const, remaining: row.remaining, limit: row.daily_limit } : { status: "limit" as const, limit: row.daily_limit, resetsAt: row.resets_at };
  };
}

async function post(body: Record<string, unknown>) {
  const res = await fetch(`${Deno.env.get("ANTHROPIC_API_URL") ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  return res.json();
}

/** The events as server-sent events: `event: <type>` and `data: <json>`. */
function stream(events: AsyncGenerator<{ type: string }>) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const e of events) controller.enqueue(encoder.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
        } catch {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ type: "error", code: "model_failed", message: "The designer stopped unexpectedly." })}\n\n`));
        } finally {
          controller.close();
        }
      },
    }),
    { headers: { ...CORS, "content-type": "text/event-stream", "cache-control": "no-cache" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ code: "bad_request" }, 400);
  const model = createAnthropicModel({ post, model: Deno.env.get("AGENT_MODEL") ?? "claude-sonnet-5-5" });
  const result = await handleAgent(await req.json().catch(() => null), { consume: consumeFor(req.headers.get("authorization")), model });
  return result.status === 200 ? stream(result.events) : json(result.body, result.status);
});
