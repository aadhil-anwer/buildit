"use client";

import type { AgentEvent } from "@/agent/run";
import { randomId } from "@/core/scene";
import type { Scene } from "@/core/types";
import { currentVersion } from "./history";
import type { ChatMessage } from "./persist";
import { useEditor } from "./store";

const ACCESS_KEY = "buildit:access-code";

function readAccessCode(): string {
  try {
    return window.localStorage.getItem(ACCESS_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveAccessCode(code: string) {
  try {
    window.localStorage.setItem(ACCESS_KEY, code);
  } catch {
    /* storage unavailable: the code is asked again next time */
  }
}

function historyFor(chat: ChatMessage[]) {
  return chat
    .filter((m) => !m.error && m.text.trim())
    .slice(-12)
    .map((m) => ({
      role: m.role,
      text:
        m.role === "assistant" && m.steps?.length
          ? `${m.text}\n(Actions: ${m.steps.map((s) => `${s.ok ? "" : "FAILED "}${s.summary}`).join("; ")})`
          : m.text,
    }));
}

function shorten(text: string, n = 48) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/**
 * Send a request to the AI designer. Changes stream in and animate live;
 * when the AI finishes they become one version that a single Undo reverts.
 * If anything fails, the room goes back to how it was.
 */
export async function askDesigner(text: string, opts: { request?: string } = {}) {
  const s = useEditor.getState();
  if (s.aiBusy || !text.trim()) return;
  const base = currentVersion(s.history);
  const history = historyFor(s.chat);
  s.pushChat({ id: randomId(), role: "user", text: text.trim() });
  const replyId = randomId();
  s.pushChat({ id: replyId, role: "assistant", text: "", steps: [], request: opts.request ?? text.trim(), versionBefore: base.id });
  s.setAi(true, "Thinking…");
  s.revertLive();

  let finalScene: Scene | null = null;
  let failed = false;
  const handle = (ev: AgentEvent) => {
    const st = useEditor.getState();
    switch (ev.type) {
      case "status":
        st.setAi(true, ev.text);
        break;
      case "step":
        st.setLive(ev.scene);
        if (ev.changed.length) st.flashIds(ev.changed);
        st.updateChat(replyId, (m) => ({ steps: [...(m.steps ?? []), ev.step] }));
        break;
      case "text":
        st.updateChat(replyId, (m) => ({ text: m.text ? `${m.text}\n\n${ev.text}` : ev.text }));
        break;
      case "done":
        finalScene = ev.scene;
        break;
      case "error":
        failed = true;
        st.updateChat(replyId, { text: ev.message, error: true });
        break;
    }
  };

  try {
    const body = JSON.stringify({ scene: base.scene, message: text.trim(), history, selectedId: s.selectedId });
    const post = () =>
      fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-code": readAccessCode() },
        body,
      });
    let res = await post();
    if (res.status === 401) {
      // The server owner protected the AI with a shared code.
      const entered = window.prompt("This AI designer needs an access code:");
      if (!entered) throw new Error("The AI designer needs an access code. Manual editing still works.");
      saveAccessCode(entered.trim());
      res = await post();
      if (res.status === 401) {
        saveAccessCode("");
        throw new Error("That access code was not accepted.");
      }
    }
    if (!res.ok || !res.body) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(j?.error ?? `The AI request failed (${res.status}).`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) handle(JSON.parse(line) as AgentEvent);
      }
    }
  } catch (err) {
    failed = true;
    useEditor.getState().updateChat(replyId, { text: err instanceof Error ? err.message : "The AI request failed.", error: true });
  }

  const st = useEditor.getState();
  st.setAi(false);
  const result = finalScene as Scene | null;
  if (!failed && result && JSON.stringify(result) !== JSON.stringify(base.scene)) {
    st.commit(result, `AI: ${shorten(opts.request ?? text)}`, "ai");
    st.updateChat(replyId, { versionAfter: useEditor.getState().history.current });
  } else {
    st.revertLive();
    if (!failed) {
      st.updateChat(replyId, (m) => (m.text ? {} : { text: "No changes were made." }));
    }
  }
}

/** Undo an AI reply's change by returning to the version before it. */
export function undoReply(m: ChatMessage) {
  if (m.versionBefore === undefined) return;
  const st = useEditor.getState();
  st.restore(m.versionBefore);
  st.showToast("Went back to the layout before that change");
}

/** Go back to before the reply and ask for a different option. */
export function tryAnother(m: ChatMessage) {
  if (m.versionBefore === undefined || !m.request) return;
  useEditor.getState().restore(m.versionBefore);
  void askDesigner(`Show me a clearly different option for: "${m.request}"`, { request: m.request });
}
