"use client";

import { useEffect, useRef, useState } from "react";
import { getObject } from "@/core/scene";
import type { Scene } from "@/core/types";
import { askDesigner, tryAnother, undoReply } from "../agentClient";
import type { ChatMessage } from "../persist";
import { useEditor } from "../store";
import { Button, Icon } from "./ui";

/** Starter requests that fit what is in the room. */
function roomSuggestions(scene: Scene): string[] {
  const has = (t: string) => scene.objects.some((o) => o.type === t);
  const out: string[] = [];
  if (has("tv_unit")) out.push("Arrange this room for a family of four. Keep the TV where it is and make sure there's enough walking space.");
  if (has("majlis_seat")) out.push("Make this majlis work for 12 guests.");
  if (has("bed")) out.push("Give the bed more space on both sides and keep the wardrobe easy to open.");
  if (has("dining_table") || has("round_table")) out.push("Seat everyone around the dining table.");
  if (!scene.objects.length) out.push("Furnish this as a living room for a family of four.");
  out.push("Give me more walking space.", "Make it work when 10 guests come over.", "Make it modern Arabic.");
  return out.slice(0, 5);
}

function selectionSuggestions(name: string) {
  return [`Move the ${name} closer to the window.`, `Put the ${name} against the nearest wall.`, `Turn the ${name} to face the room.`];
}

function Steps({ m }: { m: ChatMessage }) {
  const [open, setOpen] = useState(false);
  const steps = m.steps ?? [];
  if (!steps.length) return null;
  const failed = steps.filter((s) => !s.ok).length;
  return (
    <div className="mt-2 text-xs">
      <button type="button" className="text-stone-500 hover:text-stone-800" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"} {steps.length} change{steps.length === 1 ? "" : "s"}
        {failed ? ` (${failed} didn't work)` : ""}
      </button>
      {open && (
        <ul className="mt-1 space-y-1">
          {steps.map((s, i) => (
            <li key={i} className={`rounded-md px-2 py-1 ${s.ok ? "bg-stone-100 text-stone-700" : "bg-red-50 text-red-800"}`}>
              {s.ok ? "✓" : "✕"} {s.summary}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bubble({ m, latest }: { m: ChatMessage; latest: boolean }) {
  const aiBusy = useEditor((s) => s.aiBusy);
  const current = useEditor((s) => s.history.current);
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-3 py-2 text-sm text-white">{m.text}</div>
      </div>
    );
  }
  const applied = m.versionAfter !== undefined && current === m.versionAfter;
  return (
    <div className="flex justify-start">
      <div className={`max-w-[92%] rounded-2xl rounded-bl-md px-3 py-2 text-sm ${m.error ? "bg-red-50 text-red-900" : "bg-white text-stone-800 shadow-sm ring-1 ring-stone-200"}`}>
        {m.text ? <p className="whitespace-pre-wrap">{m.text}</p> : latest && aiBusy ? <p className="text-stone-400">Working…</p> : null}
        <Steps m={m} />
        {m.versionAfter !== undefined && !aiBusy && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {applied ? (
              <Button size="sm" onClick={() => undoReply(m)}>
                <Icon name="undo" className="h-3.5 w-3.5" /> Undo
              </Button>
            ) : (
              <Button size="sm" onClick={() => useEditor.getState().restore(m.versionAfter!)}>
                Re-apply
              </Button>
            )}
            {latest && (
              <Button size="sm" variant="ghost" onClick={() => tryAnother(m)}>
                Show another option
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatPanel() {
  const chat = useEditor((s) => s.chat);
  const aiBusy = useEditor((s) => s.aiBusy);
  const aiStatus = useEditor((s) => s.aiStatus);
  const selectedId = useEditor((s) => s.selectedId);
  const selected = useEditor((s) => (s.selectedId ? getObject(s.scene, s.selectedId) : undefined));
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, aiStatus]);

  const send = (t: string) => {
    if (!t.trim() || aiBusy) return;
    setText("");
    void askDesigner(t);
  };

  const scene = useEditor((s) => s.scene);
  const suggestions = selected ? selectionSuggestions(selected.name.toLowerCase()) : roomSuggestions(scene);
  const lastAssistant = [...chat].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Designer</h2>
          <p className="text-xs text-stone-500">Say what you want. Every change can be undone.</p>
        </div>
        {aiBusy && (
          <span className="flex items-center gap-2 text-xs text-accent">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> {aiStatus || "Working…"}
          </span>
        )}
      </div>

      <div ref={listRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {chat.length === 0 && (
          <div className="rounded-xl bg-white p-4 text-sm text-stone-600 shadow-sm ring-1 ring-stone-200">
            <p className="font-medium text-stone-800">Talk to your room.</p>
            <p className="mt-1">
              Ask for a layout, a goal (&ldquo;less cramped&rdquo;, &ldquo;seats for 10&rdquo;) or a single move. The designer only moves furniture
              through a layout engine that checks walls, doors and walking space.
            </p>
          </div>
        )}
        {chat.map((m) => (
          <Bubble key={m.id} m={m} latest={m.id === lastAssistant?.id} />
        ))}
      </div>

      <div className="border-t border-stone-200 p-3">
        {!aiBusy && (
          <div className="scroll-thin mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="shrink-0 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:border-accent hover:text-accent"
                title={s}
              >
                {s.length > 48 ? `${s.slice(0, 46)}…` : s}
              </button>
            ))}
          </div>
        )}
        {selectedId && selected && (
          <div className="mb-2 flex items-center gap-2 text-xs text-stone-500">
            <span className="rounded-md bg-accent-soft px-2 py-0.5 text-accent">&ldquo;this&rdquo; = {selected.name}</span>
          </div>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(text);
              }
            }}
            rows={2}
            placeholder={aiBusy ? "The designer is working…" : "e.g. Move the sofa against the left wall and put the coffee table in front of it"}
            disabled={aiBusy}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-stone-100"
          />
          <Button variant="primary" className="h-11 w-11 shrink-0 !p-0" disabled={aiBusy || !text.trim()} type="submit" aria-label="Send">
            <Icon name="send" />
          </Button>
        </form>
      </div>
    </div>
  );
}
