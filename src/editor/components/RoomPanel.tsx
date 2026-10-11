"use client";

import { useEffect, useState } from "react";
import { getWalls, roomArea, roomBounds } from "@/core/room";
import type { OpeningType } from "@/core/types";
import { setMinWalkway, updateRoom } from "../actions";
import { deleteProject, listProjects, type ProjectMeta } from "../persist";
import { reopen, useEditor } from "../store";
import { Button, Icon, NumberField, Section } from "./ui";

const FLOORS = ["#d9cbb6", "#c9a77c", "#e9e4da", "#a68a6d", "#bfb7ab", "#efe9df"];
const WALL_COLORS = ["#f2eee8", "#f3ece0", "#e9e6e1", "#efe6d6", "#dfe6e2", "#e8ddd0"];

function Swatches({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onPick(c)}
          className={`h-6 w-6 rounded-md ring-1 ring-black/10 ${value === c ? "outline-2 outline-offset-2 outline-accent" : ""}`}
          style={{ background: c }}
        />
      ))}
      <input type="color" value={value} onChange={(e) => onPick(e.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
    </div>
  );
}

export function RoomPanel({ onNewRoom }: { onNewRoom: () => void }) {
  const scene = useEditor((s) => s.scene);
  const projectId = useEditor((s) => s.projectId);
  const aiBusy = useEditor((s) => s.aiBusy);
  const room = scene.room;
  const walls = getWalls(room);
  const b = roomBounds(room);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [adding, setAdding] = useState<{ type: OpeningType; wall: number; offset: number; width: number }>({ type: "window", wall: 0, offset: 0.5, width: 1.2 });

  useEffect(() => {
    setProjects(listProjects());
  }, [projectId, scene.room.name]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${room.name.replace(/[^\w-]+/g, "_") || "room"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <fieldset disabled={aiBusy} className="scroll-thin h-full overflow-y-auto disabled:opacity-70">
      <Section title="Room">
        <label className="mb-2 flex flex-col gap-1 text-xs text-stone-600">
          Name
          <input
            key={room.name}
            defaultValue={room.name}
            onBlur={(e) => e.target.value.trim() && e.target.value !== room.name && updateRoom({ name: e.target.value.trim() }, "Renamed room")}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm outline-none focus:border-accent"
          />
        </label>
        <p className="mb-2 text-xs text-stone-500">
          {(b.maxX - b.minX).toFixed(2)} × {(b.maxZ - b.minZ).toFixed(2)} m · {roomArea(room).toFixed(1)} m² · {walls.length} walls
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Ceiling" suffix="m" value={room.height} min={2} max={6} step={0.05} onCommit={(v) => updateRoom({ height: v }, "Changed ceiling height")} />
          <NumberField
            label="Min. walkway"
            suffix="cm"
            value={Math.round(scene.constraints.minWalkway * 100)}
            min={50}
            max={150}
            onCommit={(v) => setMinWalkway(v / 100)}
          />
        </div>
      </Section>

      <Section title="Finishes">
        <p className="mb-1 text-xs text-stone-600">Floor</p>
        <Swatches colors={FLOORS} value={room.floorColor} onPick={(c) => updateRoom({ floorColor: c }, "Changed floor")} />
        <p className="mb-1 mt-3 text-xs text-stone-600">Walls</p>
        <Swatches colors={WALL_COLORS} value={room.wallColor} onPick={(c) => updateRoom({ wallColor: c }, "Changed walls")} />
      </Section>

      <Section title="Doors & windows">
        <ul className="mb-3 space-y-1">
          {room.openings.map((o) => (
            <li key={o.id} className="flex items-center justify-between rounded-md bg-white px-2 py-1 text-xs ring-1 ring-stone-200">
              <span>
                <span className="font-medium text-stone-800">{o.id}</span> · {walls[o.wall]?.id ?? "?"} wall · {Math.round(o.offset * 100)} cm in · {Math.round(o.width * 100)} cm wide
              </span>
              <button
                type="button"
                aria-label={`Remove ${o.id}`}
                className="rounded p-0.5 text-stone-400 hover:text-red-700"
                onClick={() => updateRoom({ openings: room.openings.filter((x) => x.id !== o.id) }, `Removed ${o.id}`)}
              >
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {!room.openings.length && <li className="text-xs text-stone-500">None yet.</li>}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-stone-600">
            Type
            <select value={adding.type} onChange={(e) => setAdding({ ...adding, type: e.target.value as OpeningType })} className="rounded-md border border-stone-300 bg-white px-1 py-1 text-sm">
              <option value="door">Door</option>
              <option value="window">Window</option>
              <option value="opening">Open passage</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone-600">
            Wall
            <select value={adding.wall} onChange={(e) => setAdding({ ...adding, wall: Number(e.target.value) })} className="rounded-md border border-stone-300 bg-white px-1 py-1 text-sm">
              {walls.map((w) => (
                <option key={w.index} value={w.index}>
                  {w.id} ({w.length.toFixed(2)} m)
                </option>
              ))}
            </select>
          </label>
          <NumberField label="From left end" suffix="m" value={adding.offset} min={0} max={30} step={0.05} onCommit={(v) => setAdding({ ...adding, offset: v })} />
          <NumberField label="Width" suffix="m" value={adding.width} min={0.3} max={10} step={0.05} onCommit={(v) => setAdding({ ...adding, width: v })} />
        </div>
        <Button
          size="sm"
          className="mt-2"
          onClick={() => {
            const w = walls[adding.wall];
            if (!w || adding.offset + adding.width > w.length + 1e-6) {
              useEditor.getState().showToast(`That doesn't fit on the ${w?.id ?? ""} wall (${w?.length.toFixed(2)} m).`);
              return;
            }
            const n = room.openings.filter((o) => o.type === adding.type).length + 1;
            const id = `${adding.type}_${n}`;
            updateRoom(
              {
                openings: [
                  ...room.openings,
                  { id, type: adding.type, wall: adding.wall, offset: adding.offset, width: adding.width, height: adding.type === "window" ? 1.3 : 2.1, sill: adding.type === "window" ? 0.9 : 0 },
                ],
              },
              `Added ${id}`,
            );
          }}
        >
          <Icon name="plus" className="h-3.5 w-3.5" /> Add {adding.type === "opening" ? "passage" : adding.type}
        </Button>
      </Section>

      <Section
        title="My rooms"
        action={
          <Button size="sm" variant="primary" onClick={onNewRoom}>
            <Icon name="plus" className="h-3.5 w-3.5" /> New
          </Button>
        }
      >
        <p className="mb-2 text-xs text-stone-500">Saved in this browser.</p>
        <ul className="space-y-1">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => p.id !== projectId && reopen(p.id)}
                className={`flex-1 truncate rounded-md px-2 py-1 text-left text-sm ${p.id === projectId ? "bg-accent-soft font-medium text-accent" : "hover:bg-stone-100"}`}
              >
                {p.name}
              </button>
              {p.id !== projectId && (
                <button
                  type="button"
                  aria-label={`Delete ${p.name}`}
                  className="rounded p-1 text-stone-400 hover:text-red-700"
                  onClick={() => {
                    if (window.confirm(`Delete "${p.name}" from this browser?`)) {
                      deleteProject(p.id);
                      setProjects(listProjects());
                    }
                  }}
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <Button size="sm" className="mt-3" onClick={exportJson}>
          <Icon name="download" className="h-3.5 w-3.5" /> Export this room (JSON)
        </Button>
      </Section>
    </fieldset>
  );
}
