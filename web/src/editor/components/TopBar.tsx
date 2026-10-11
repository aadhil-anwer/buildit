"use client";

import { canUndo, redoTarget } from "../history";
import { shareUrl } from "../persist";
import { useEditor } from "../store";
import { Button, Icon } from "./ui";

async function share() {
  const s = useEditor.getState();
  const url = shareUrl(s.scene);
  try {
    await navigator.clipboard.writeText(url);
    s.showToast("Link copied. Whoever opens it gets their own copy of this room.");
  } catch {
    window.prompt("Copy this link to share the room:", url);
  }
}

export function TopBar({ onNewRoom }: { onNewRoom: () => void }) {
  const history = useEditor((s) => s.history);
  const view = useEditor((s) => s.view);
  const name = useEditor((s) => s.scene.room.name);
  const aiBusy = useEditor((s) => s.aiBusy);
  const undoable = canUndo(history) && !aiBusy;
  const redoable = !!redoTarget(history) && !aiBusy;
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-stone-200 bg-paper px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
          <Icon name="cube" className="h-4 w-4" />
        </span>
        <span className="hidden text-sm font-semibold sm:inline">BuildIt</span>
        <span className="hidden text-stone-300 sm:inline">/</span>
        <span className="truncate text-sm text-stone-700">{name}</span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" disabled={!undoable} onClick={() => useEditor.getState().undo()} title="Undo (Ctrl+Z)" aria-label="Undo">
          <Icon name="undo" />
        </Button>
        <Button variant="ghost" size="sm" disabled={!redoable} onClick={() => useEditor.getState().redo()} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
          <Icon name="redo" />
        </Button>
        <div className="mx-1 flex rounded-lg bg-stone-200/70 p-0.5 text-xs">
          {(["3d", "top"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => useEditor.getState().setView(v)}
              className={`rounded-md px-2 py-1 font-medium ${view === v ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}
            >
              {v === "3d" ? "3D" : "Plan"}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={share} title="Copy a link to this room">
          <Icon name="share" /> <span className="hidden sm:inline">Share</span>
        </Button>
        <Button size="sm" variant="primary" onClick={onNewRoom} disabled={aiBusy}>
          <Icon name="plus" /> <span className="hidden sm:inline">New room</span>
        </Button>
      </div>
    </header>
  );
}
