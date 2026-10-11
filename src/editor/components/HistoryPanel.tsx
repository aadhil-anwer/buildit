"use client";

import { useEffect, useState } from "react";
import { useEditor } from "../store";

function ago(t: number, now: number) {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
}

export function HistoryPanel() {
  const history = useEditor((s) => s.history);
  const aiBusy = useEditor((s) => s.aiBusy);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const versions = [...history.versions].reverse();
  return (
    <div className="scroll-thin h-full overflow-y-auto px-2 py-3">
      <p className="px-2 pb-2 text-xs text-stone-500">Every change is kept. Click any version to go back to it; nothing is deleted.</p>
      <ul className="space-y-1">
        {versions.map((v) => {
          const current = v.id === history.current;
          return (
            <li key={v.id}>
              <button
                type="button"
                disabled={aiBusy}
                onClick={() => useEditor.getState().restore(v.id)}
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left ${current ? "bg-accent-soft" : "hover:bg-stone-100"}`}
              >
                <span className="mt-0.5 w-8 shrink-0 text-[11px] tabular-nums text-stone-400">v{v.id}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${current ? "font-semibold text-accent" : "text-stone-800"}`}>{v.label}</span>
                  <span className="block text-[11px] text-stone-500">
                    {v.source === "ai" ? "AI" : v.source === "system" ? "Start" : "You"} · {ago(v.at, now)}
                    {current ? " · current" : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
