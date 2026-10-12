import { sampleBedroom } from "@buildit/core";
import { parseEvents, type DesignerEvent } from "./sse";

const facts = { score: 75, walkwayCm: 55, errors: 0, warnings: 2, seats: 1, tipsMet: 1, tipsTotal: 2 };
const sse = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
async function* chunks(...parts: string[]) {
  for (const p of parts) yield await Promise.resolve(p);
}
const all = async (it: AsyncGenerator<DesignerEvent>) => {
  const out: DesignerEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
};
const done = (scene: unknown) => sse("done", { scene, steps: [], verdict: "unchanged", before: facts, after: facts, reply: null });

test("events arrive in order with their data checked", async () => {
  const text = sse("text", { text: "Hello" }) + done(sampleBedroom());
  const events = await all(parseEvents(chunks(text)));
  expect(events.map((e) => e.type)).toEqual(["text", "done"]);
});

test("an event split across chunks anywhere is put back together", async () => {
  const text = sse("text", { text: "Hello" }) + sse("text", { text: "World" });
  const cut = Math.floor(text.length / 2) + 3;
  const events = await all(parseEvents(chunks(text.slice(0, 5), text.slice(5, cut), text.slice(cut))));
  expect(events.map((e) => (e.type === "text" ? e.text : ""))).toEqual(["Hello", "World"]);
});

test("a step's scene is parsed into a real scene", async () => {
  const [e] = await all(parseEvents(chunks(sse("step", { step: { tool: "restyle_room", ok: true, summary: "Restyled" }, scene: sampleBedroom(), changed: ["bed_1"] }))));
  expect(e.type === "step" && e.scene.objects.length).toBe(sampleBedroom().objects.length);
});

test("a scene that is not a scene is an error, not something to show", async () => {
  await expect(all(parseEvents(chunks(done({ version: 1, nonsense: true }))))).rejects.toThrow(/not a valid scene/);
});

test("an event of an unknown kind, or with the wrong shape, is an error", async () => {
  await expect(all(parseEvents(chunks(sse("surprise", {}))))).rejects.toThrow();
  await expect(all(parseEvents(chunks(sse("text", { text: 5 }))))).rejects.toThrow();
});

test("a final event with no blank line after it is still read", async () => {
  const events = await all(parseEvents(chunks(`event: text\ndata: ${JSON.stringify({ type: "text", text: "tail" })}`)));
  expect(events).toHaveLength(1);
});
