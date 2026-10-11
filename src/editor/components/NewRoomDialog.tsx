"use client";

import { useRef, useState } from "react";
import { importRoomPlan, looksLikeRoomPlan } from "@/core/importers/roomplan";
import { RECT_WALL, makeOpening } from "@/core/room";
import { parseScene } from "@/core/schema";
import { randomId } from "@/core/scene";
import { TEMPLATES, emptyRoom } from "@/core/templates";
import type { Compass, OpeningType, Scene } from "@/core/types";
import { useEditor } from "../store";
import { Button, Icon, NumberField } from "./ui";

interface Row {
  key: string;
  type: OpeningType;
  wall: Compass;
  offset: number;
  width: number;
}

const WALLS: Compass[] = ["north", "east", "south", "west"];

export function openScene(scene: Scene, label: string) {
  useEditor.getState().newProject({ ...scene, id: randomId() }, label);
}

/** Read a scene file or a RoomPlan scan. Returns notes to show, or throws. */
export async function importFile(file: File): Promise<string[]> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not JSON.");
  }
  const scene = parseScene(data);
  if (scene) {
    openScene(scene, `Imported ${file.name}`);
    return [`Opened ${scene.room.name}.`];
  }
  if (looksLikeRoomPlan(data)) {
    const res = importRoomPlan(data, file.name.replace(/\.json$/i, ""));
    openScene(res.scene, "Imported RoomPlan scan");
    return res.notes;
  }
  throw new Error("Not a BuildIt room or a RoomPlan scan.");
}

export function NewRoomDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("My room");
  const [width, setWidth] = useState(5);
  const [length, setLength] = useState(4);
  const [height, setHeight] = useState(2.9);
  const [rows, setRows] = useState<Row[]>([
    { key: "d", type: "door", wall: "south", offset: 0.4, width: 0.9 },
    { key: "w", type: "window", wall: "north", offset: 1.5, width: 1.6 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const create = () => {
    const wallLen = (w: Compass) => (w === "north" || w === "south" ? width : length);
    const bad = rows.find((r) => r.offset < 0 || r.offset + r.width > wallLen(r.wall) + 1e-6);
    if (bad) {
      setError(`The ${bad.type} on the ${bad.wall} wall doesn't fit: the wall is ${wallLen(bad.wall)} m long.`);
      return;
    }
    const scene = emptyRoom({
      name: name.trim() || "My room",
      width,
      length,
      height,
      openings: rows.map((r) => makeOpening(r.type, RECT_WALL[r.wall], r.offset, r.width)),
    });
    openScene(scene, "Empty room");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="scroll-thin max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-paper p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="New room"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">New room</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-stone-500 hover:bg-stone-200" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Start from an example</h3>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-left text-sm hover:border-accent"
              onClick={() => {
                openScene(t.build(), "Original layout");
                onClose();
              }}
            >
              <span className="block font-medium text-stone-800">{t.name}</span>
            </button>
          ))}
        </div>

        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Or enter your room</h3>
        <label className="mb-3 flex flex-col gap-1 text-xs text-stone-600">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm outline-none focus:border-accent" />
        </label>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <NumberField label="Width (east-west)" suffix="m" value={width} min={1.5} max={20} step={0.05} onCommit={setWidth} />
          <NumberField label="Length (north-south)" suffix="m" value={length} min={1.5} max={20} step={0.05} onCommit={setLength} />
          <NumberField label="Ceiling" suffix="m" value={height} min={2} max={6} step={0.05} onCommit={setHeight} />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-stone-600">Doors and windows (offset from the left end, facing the wall from inside)</span>
          <Button size="sm" variant="ghost" onClick={() => setRows([...rows, { key: randomId(), type: "window", wall: "east", offset: 0.5, width: 1.2 }])}>
            <Icon name="plus" className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="mb-4 space-y-2">
          {rows.map((r, i) => (
            <div key={r.key} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-stone-600">
                Type
                <select
                  value={r.type}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, type: e.target.value as OpeningType } : x)))}
                  className="rounded-md border border-stone-300 bg-white px-1 py-1 text-sm"
                >
                  <option value="door">Door</option>
                  <option value="window">Window</option>
                  <option value="opening">Open passage</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-stone-600">
                Wall
                <select
                  value={r.wall}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, wall: e.target.value as Compass } : x)))}
                  className="rounded-md border border-stone-300 bg-white px-1 py-1 text-sm"
                >
                  {WALLS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField label="Offset" suffix="m" value={r.offset} min={0} max={20} step={0.05} onCommit={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, offset: v } : x)))} />
              <NumberField label="Width" suffix="m" value={r.width} min={0.3} max={10} step={0.05} onCommit={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, width: v } : x)))} />
              <button type="button" className="mb-1 rounded-md p-1 text-stone-400 hover:bg-stone-200 hover:text-red-700" aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
        {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={() => fileRef.current?.click()} title="A BuildIt room file or an Apple RoomPlan scan (JSON)">
            <Icon name="upload" /> Import file or scan
          </Button>
          <Button variant="primary" onClick={create}>
            Create room
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const notes = await importFile(f);
              useEditor.getState().showToast(notes.join(" "));
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not import that file.");
            }
          }}
        />
      </div>
    </div>
  );
}
