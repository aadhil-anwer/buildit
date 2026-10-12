import { parseScene, type Scene } from "@buildit/core";
import { z } from "zod";

const facts = z.object({ score: z.number(), walkwayCm: z.number().nullable(), errors: z.number(), warnings: z.number(), seats: z.number(), tipsMet: z.number(), tipsTotal: z.number() });
const step = z.object({ tool: z.string(), ok: z.boolean(), summary: z.string() });
const sceneField = z.unknown().transform((v, ctx): Scene => {
  const scene = parseScene(v);
  if (!scene) ctx.addIssue({ code: "custom", message: "the scene in a designer event is not a valid scene" });
  return scene as Scene;
});

/** One thing the designer's stream says. Every event is checked; a bad one is an error, never a guess. */
const event = z.discriminatedUnion("type", [
  z.object({ type: z.literal("step"), step, scene: sceneField, changed: z.array(z.string()) }),
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("done"), scene: sceneField, steps: z.array(step), verdict: z.enum(["changed", "unchanged", "reverted"]), before: facts, after: facts, reply: z.string().nullable() }),
  z.object({ type: z.literal("error"), code: z.enum(["model_failed", "refused", "too_long"]), message: z.string() }),
]);

export type DesignerEvent = z.infer<typeof event>;

/** The data of each server-sent event in a stream of text chunks, parsed and checked. Chunks may split an event anywhere. */
export async function* parseEvents(chunks: AsyncIterable<string>): AsyncGenerator<DesignerEvent> {
  let buffer = "";
  const take = function* () {
    for (let end = buffer.indexOf("\n\n"); end >= 0; end = buffer.indexOf("\n\n")) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
      if (data) yield event.parse(JSON.parse(data));
    }
  };
  for await (const chunk of chunks) {
    buffer += chunk;
    yield* take();
  }
  buffer += "\n\n";
  yield* take();
}
