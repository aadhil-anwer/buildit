import type { Scene } from "@buildit/core";
import { create } from "zustand";
import { useToast } from "@/components/toast";
import { useEditor } from "@/editor/store";
import { t } from "@/i18n";
import { report } from "@/lib/report";
import { useRooms } from "@/rooms/store";
import { changeLines } from "./changes";
import { askDesigner, type Refusal } from "./client";
import { measuredRows, type MeasuredRow } from "./measured";

type Kind = "offline" | "unreachable" | "model_failed" | "refused" | "too_long";

/** What the Ask tab is showing. Every state but `idle` and `running` tells the person what happens next. */
export type Phase =
  | { name: "idle" }
  | { name: "running"; question: string; lines: string[] }
  | { name: "done"; question: string; verdict: "changed" | "unchanged" | "reverted"; lines: string[]; rows: MeasuredRow[]; reply: string | null; changedIds: string[] }
  | { name: "limit"; resetsAt: Date }
  | { name: "guest" }
  | { name: "error"; kind: Kind; question: string };

interface State {
  phase: Phase;
  /** Requests sent this visit; the usage line re-reads the server when it changes. */
  requests: number;
  turns: { role: "user" | "assistant"; text: string }[];
}

export const useAsk = create<State>()(() => ({ phase: { name: "idle" }, requests: 0, turns: [] }));
const set = (phase: Phase) => useAsk.setState({ phase });

const changedIds = (before: Scene, after: Scene) => after.objects.filter((o) => JSON.stringify(before.objects.find((p) => p.id === o.id)) !== JSON.stringify(o)).map((o) => o.id);

function refusedPhase(r: Refusal, question: string): Phase {
  if (r.code === "limit") return { name: "limit", resetsAt: r.resetsAt };
  if (r.code === "email_required" || r.code === "unauthenticated") return { name: "guest" };
  return { name: "error", kind: r.code === "offline" ? "offline" : "unreachable", question };
}

/** Sends a request to the designer and plays the answer into the editor: each step as a preview, the result as one undoable change. */
export async function send(question: string, { avoid }: { avoid?: string[] } = {}) {
  const editor = useEditor.getState();
  if (!editor.history || useAsk.getState().phase.name === "running") return;
  const start = editor.history.present;
  set({ name: "running", question, lines: [] });
  useAsk.setState((s) => ({ requests: s.requests + 1 }));
  try {
    const result = await askDesigner({ scene: start, message: question, history: useAsk.getState().turns.slice(-8), selectedId: editor.selectedId, avoid });
    if (!result.ok) return set(refusedPhase(result, question));
    await play(result.events, start, question);
  } catch (error) {
    report(error, { source: "ask-designer" });
    set({ name: "error", kind: "unreachable", question });
  } finally {
    useEditor.getState().setPreview(null);
  }
}

async function play(events: AsyncGenerator<import("./sse").DesignerEvent>, start: Scene, question: string) {
  let shown = start;
  for await (const e of events) {
    if (e.type === "step") {
      const lines = changeLines(shown, e.scene);
      shown = e.scene;
      useEditor.getState().setPreview(e.scene);
      useAsk.setState((s) => (s.phase.name === "running" ? { phase: { ...s.phase, lines: [...s.phase.lines, ...lines] } } : s));
    } else if (e.type === "error") {
      return set({ name: "error", kind: e.code, question });
    } else if (e.type === "done") {
      const changed = e.verdict === "changed";
      if (changed) useEditor.getState().commit({ ok: true, scene: e.scene, message: "", changed: [] });
      useAsk.setState((s) => ({ turns: [...s.turns, { role: "user" as const, text: question }, ...(e.reply ? [{ role: "assistant" as const, text: e.reply }] : [])].slice(-12) }));
      set({ name: "done", question, verdict: e.verdict, lines: changed ? changeLines(start, e.scene) : [], rows: changed ? measuredRows(e.before, e.after) : [], reply: e.reply, changedIds: changed ? changedIds(start, e.scene) : [] });
    }
  }
}

/** Keep the result: save it as a named version (the room is already in the history, so Undo still works). */
export function keep() {
  const { phase } = useAsk.getState();
  const roomId = useEditor.getState().roomId;
  if (phase.name === "done" && roomId) useRooms.getState().saveVersion(roomId, phase.question.slice(0, 60) || t("verSaveLabel"));
  useToast.getState().show(t("tKept"));
  set({ name: "idle" });
}

/** Take the change back: one step of the editor's own Undo. */
export function undoResult() {
  if (useAsk.getState().phase.name === "done") useEditor.getState().undo();
  set({ name: "idle" });
}

/** Take the change back and ask again for a different approach. */
export function another() {
  const { phase } = useAsk.getState();
  if (phase.name !== "done") return;
  useEditor.getState().undo();
  void send(phase.question, { avoid: phase.changedIds });
}

export const dismiss = () => set({ name: "idle" });
