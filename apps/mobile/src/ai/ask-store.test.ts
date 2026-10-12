import { design, sampleBedroom, type Facts, type Scene } from "@buildit/core";
import { useEditor } from "@/editor/store";
import { t } from "@/i18n";
import { useRooms } from "@/rooms/store";
import { another, dismiss, keep, send, undoResult, useAsk } from "./ask-store";
import { askDesigner } from "./client";
import type { DesignerEvent } from "./sse";

jest.mock("./client", () => ({ askDesigner: jest.fn() }));
jest.mock("@/lib/report", () => ({ report: jest.fn() }));
const ask = jest.mocked(askDesigner);

const facts = (over: Partial<Facts> = {}): Facts => ({ score: 75, walkwayCm: 55, errors: 0, warnings: 2, seats: 1, tipsMet: 0, tipsTotal: 0, ...over });
const warmer = (s: Scene): Scene => ({ ...s, room: { ...s.room, wallColor: design.styles.japan.wall } });
async function* stream(...events: DesignerEvent[]) {
  for (const e of events) yield await Promise.resolve(e);
}
const done = (scene: Scene, over: Partial<Extract<DesignerEvent, { type: "done" }>> = {}): DesignerEvent => ({ type: "done", scene, steps: [], verdict: "changed", before: facts(), after: facts({ score: 91, walkwayCm: 92 }), reply: null, ...over });
const present = () => useEditor.getState().history!.present;

beforeEach(() => {
  ask.mockReset();
  const scene = sampleBedroom();
  useRooms.setState({ rooms: [{ id: "r", name: "R", scene, updatedAt: 0, dirty: false }] });
  useEditor.getState().open("r", scene);
  useAsk.setState({ phase: { name: "idle" }, requests: 0, turns: [] });
});

test("a result is played in as one undoable change, with the engine's lines and measured rows", async () => {
  const start = present();
  const step: DesignerEvent = { type: "step", step: { tool: "restyle_room", ok: true, summary: "x" }, scene: warmer(start), changed: [] };
  ask.mockResolvedValue({ ok: true, events: stream(step, done(warmer(start), { reply: "Warmer now." })) });
  await send("make it warmer");
  const phase = useAsk.getState().phase;
  expect(phase).toMatchObject({ name: "done", verdict: "changed", reply: "Warmer now." });
  expect(phase.name === "done" && phase.lines).toEqual([t("aiWall")]);
  expect(phase.name === "done" && phase.rows.map((r) => r.key)).toEqual(["score", "walkwayCm"]);
  expect(present().room.wallColor).toBe(design.styles.japan.wall);
  expect(useEditor.getState().history!.past).toHaveLength(1);
  expect(useEditor.getState().preview).toBeNull();
});

test("while it works each step is shown as a preview, not yet in the history", async () => {
  const start = present();
  let seenPreview: Scene | null = null;
  async function* slow() {
    yield await Promise.resolve({ type: "step", step: { tool: "restyle_room", ok: true, summary: "x" }, scene: warmer(start), changed: [] } as DesignerEvent);
    seenPreview = useEditor.getState().preview;
    expect(useEditor.getState().history!.past).toHaveLength(0);
    yield done(warmer(start));
  }
  ask.mockResolvedValue({ ok: true, events: slow() });
  await send("warmer");
  expect(seenPreview).not.toBeNull();
});

test("a result that changed nothing, or was reverted, leaves the room alone and says so", async () => {
  const start = present();
  ask.mockResolvedValue({ ok: true, events: stream(done(start, { verdict: "reverted", after: facts() })) });
  await send("move the bed");
  expect(useAsk.getState().phase).toMatchObject({ name: "done", verdict: "reverted", lines: [], rows: [] });
  expect(useEditor.getState().history!.past).toHaveLength(0);
});

test.each([
  [{ ok: false, code: "limit", resetsAt: new Date(5) }, { name: "limit" }],
  [{ ok: false, code: "email_required" }, { name: "guest" }],
  [{ ok: false, code: "offline" }, { name: "error", kind: "offline" }],
  [{ ok: false, code: "unreachable" }, { name: "error", kind: "unreachable" }],
])("a refusal before it starts becomes the right state: %j", async (refusal, expected) => {
  ask.mockResolvedValue(refusal as never);
  await send("hi");
  expect(useAsk.getState().phase).toMatchObject(expected);
});

test("an error event from the designer is an error state, with nothing applied", async () => {
  ask.mockResolvedValue({ ok: true, events: stream({ type: "error", code: "model_failed", message: "x" }) });
  await send("hi");
  expect(useAsk.getState().phase).toMatchObject({ name: "error", kind: "model_failed", question: "hi" });
  expect(useEditor.getState().history!.past).toHaveLength(0);
});

test("a stream that breaks halfway is reported and shown as an error, and the preview is cleared", async () => {
  async function* broken(): AsyncGenerator<DesignerEvent> {
    yield await Promise.resolve({ type: "step", step: { tool: "x", ok: true, summary: "" }, scene: warmer(present()), changed: [] } as DesignerEvent);
    throw new Error("connection lost");
  }
  ask.mockResolvedValue({ ok: true, events: broken() });
  await send("hi");
  expect(useAsk.getState().phase).toMatchObject({ name: "error", kind: "unreachable" });
  expect(useEditor.getState().preview).toBeNull();
});

test("a second request while one is running is ignored", async () => {
  let release: () => void = () => undefined;
  ask.mockImplementation(() => new Promise((resolve) => (release = () => resolve({ ok: false, code: "offline" }))));
  const first = send("one");
  await send("two");
  expect(ask).toHaveBeenCalledTimes(1);
  release();
  await first;
});

test("Keep saves a named version and clears the card; the change stays in the history", async () => {
  const start = present();
  ask.mockResolvedValue({ ok: true, events: stream(done(warmer(start))) });
  await send("make it warmer");
  keep();
  expect(useRooms.getState().rooms[0].versions?.[0].label).toBe("make it warmer");
  expect(useAsk.getState().phase.name).toBe("idle");
  expect(useEditor.getState().history!.past).toHaveLength(1);
});

test("Undo takes the change back, and dismissing just closes the card", async () => {
  const start = present();
  ask.mockResolvedValue({ ok: true, events: stream(done(warmer(start))) });
  await send("make it warmer");
  undoResult();
  expect(present().room.wallColor).toBe(start.room.wallColor);
  expect(useAsk.getState().phase.name).toBe("idle");
  useAsk.setState({ phase: { name: "limit", resetsAt: new Date() } });
  dismiss();
  expect(useAsk.getState().phase.name).toBe("idle");
});

test("Show another option takes the change back and asks again, telling the designer what to avoid", async () => {
  const start = present();
  const bed = start.objects.find((o) => o.type === "bed")!;
  const moved: Scene = { ...start, objects: start.objects.map((o) => (o.id === bed.id ? { ...o, x: o.x + 0.2 } : o)) };
  ask.mockResolvedValueOnce({ ok: true, events: stream(done(moved)) });
  await send("more space");
  ask.mockResolvedValueOnce({ ok: true, events: stream(done(start, { verdict: "unchanged" })) });
  another();
  await new Promise((r) => setTimeout(r, 0));
  expect(present()).toBe(start);
  expect(ask.mock.calls[1][0]).toMatchObject({ message: "more space", avoid: [bed.id] });
});

test("the conversation so far goes with the next request", async () => {
  ask.mockResolvedValue({ ok: true, events: stream(done(warmer(present()), { reply: "Done." })) });
  await send("warmer");
  ask.mockResolvedValue({ ok: false, code: "offline" });
  await send("and the rug");
  expect(ask.mock.calls[1][0].history).toEqual([{ role: "user", text: "warmer" }, { role: "assistant", text: "Done." }]);
});
