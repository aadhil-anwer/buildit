"use client";

import { useState } from "react";
import { costSummary, totalSeats } from "@/core/scene";
import type { LayoutReport } from "@/core/summary";
import { useEditor } from "../store";
import { Icon } from "./ui";

export function IssuesBar({ report }: { report: LayoutReport | null }) {
  const [open, setOpen] = useState(false);
  const scene = useEditor((s) => s.scene);
  const showWalkways = useEditor((s) => s.showWalkways);
  if (!report) return null;
  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");
  const cost = costSummary(scene);
  const ok = !errors.length && !warnings.length;

  return (
    <div className="pointer-events-auto flex max-w-full flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm ring-1 ${
            errors.length ? "bg-red-50 text-red-800 ring-red-200" : warnings.length ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-white text-accent ring-stone-200"
          }`}
        >
          {ok ? "✓ Layout OK" : `${errors.length ? `${errors.length} problem${errors.length > 1 ? "s" : ""}` : ""}${errors.length && warnings.length ? " · " : ""}${warnings.length ? `${warnings.length} tight spot${warnings.length > 1 ? "s" : ""}` : ""}`}
        </button>
        <span className="rounded-full bg-white px-3 py-1 text-xs text-stone-700 shadow-sm ring-1 ring-stone-200">
          {totalSeats(scene)} seats · {Math.round(report.clearance.walkableRatio * 100)}% of free floor walkable
        </span>
        {cost.pricedCount > 0 && (
          <span className="rounded-full bg-white px-3 py-1 text-xs text-stone-700 shadow-sm ring-1 ring-stone-200">
            {cost.total} {cost.currency} · {cost.pricedCount} priced item{cost.pricedCount > 1 ? "s" : ""}
          </span>
        )}
        <button
          type="button"
          onClick={() => useEditor.getState().toggleWalkways()}
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium shadow-sm ring-1 ${showWalkways ? "bg-accent text-white ring-accent" : "bg-white text-stone-700 ring-stone-200"}`}
          title="Green: comfortable walking space from the door. Red: free floor too tight to walk through."
        >
          <Icon name="walk" className="h-3.5 w-3.5" /> Walking space
        </button>
      </div>
      {open && !ok && (
        <ul className="scroll-thin max-h-56 w-[min(92vw,420px)] space-y-1 overflow-y-auto rounded-xl bg-white/95 p-2 shadow-lg ring-1 ring-stone-200">
          {[...errors, ...warnings].map((i, k) => (
            <li key={k}>
              <button
                type="button"
                className={`w-full rounded-md px-2 py-1 text-left text-xs ${i.severity === "error" ? "text-red-800 hover:bg-red-50" : "text-amber-900 hover:bg-amber-50"}`}
                onClick={() => useEditor.getState().select(i.objectIds[0] ?? null)}
              >
                {i.message}
              </button>
            </li>
          ))}
        </ul>
      )}
      {showWalkways && (
        <div className="flex items-center gap-3 rounded-full bg-white/90 px-3 py-1 text-[11px] text-stone-600 shadow-sm ring-1 ring-stone-200">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#4aaa6e]" /> walkable ({Math.round(scene.constraints.minWalkway * 100)} cm)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#de5a46]" /> too tight / cut off
          </span>
        </div>
      )}
    </div>
  );
}
