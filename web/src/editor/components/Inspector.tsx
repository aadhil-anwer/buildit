"use client";

import { getCatalogItem } from "@/core/catalog";
import { facingLabel } from "@/core/geometry";
import type { Issue } from "@/core/layout/validate";
import { getObject } from "@/core/scene";
import { colorSelected, deleteSelected, resizeSelected, rotateSelected, snapSelectedToWall, toggleLockSelected } from "../actions";
import { useEditor } from "../store";
import { Button, Icon, NumberField } from "./ui";

const SWATCHES = ["#b8ab98", "#e9e6e1", "#8f8577", "#3b3b3b", "#1f5e4f", "#1f3557", "#7a2e2e", "#b5653a", "#c9a77c", "#7a5a43", "#d9c7a7", "#9aa58f"];

export function Inspector({ issues }: { issues: Issue[] }) {
  const o = useEditor((s) => (s.selectedId ? getObject(s.scene, s.selectedId) : undefined));
  const aiBusy = useEditor((s) => s.aiBusy);
  if (!o) return null;
  const item = getCatalogItem(o.catalogId);
  const mine = issues.filter((i) => i.objectIds.includes(o.id));
  return (
    <div className="pointer-events-auto w-[min(100%,340px)] rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-stone-200 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-900">{o.name}</p>
          <p className="text-xs text-stone-500">
            {o.id} · facing {facingLabel(o.rotation)}
            {o.seats ? ` · seats ${o.seats}` : ""}
          </p>
          {item?.product && (
            <p className="mt-0.5 text-xs font-medium text-accent">
              {item.product.price} {item.product.currency} · {item.product.shop}
              {item.product.inStock ? "" : " · out of stock"}
            </p>
          )}
        </div>
        <button type="button" className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700" onClick={() => useEditor.getState().select(null)} aria-label="Close">
          <Icon name="x" />
        </button>
      </div>

      <fieldset disabled={aiBusy} className="mt-3 space-y-3 disabled:opacity-60">
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" onClick={() => rotateSelected(90)} title="Rotate left (R)">
            <Icon name="rotL" className="h-3.5 w-3.5" /> 90°
          </Button>
          <Button size="sm" onClick={() => rotateSelected(-90)} title="Rotate right (Shift+R)">
            <Icon name="rotR" className="h-3.5 w-3.5" /> 90°
          </Button>
          <Button size="sm" onClick={() => rotateSelected(15)} title="Rotate 15° (Q)">
            15°
          </Button>
          <Button size="sm" onClick={snapSelectedToWall} title="Push back against the nearest wall">
            <Icon name="wall" className="h-3.5 w-3.5" /> To wall
          </Button>
          <Button size="sm" onClick={toggleLockSelected} title="Locked items are never moved by the AI">
            <Icon name={o.locked ? "lock" : "unlock"} className="h-3.5 w-3.5" /> {o.locked ? "Locked" : "Lock"}
          </Button>
          <Button size="sm" variant="danger" onClick={deleteSelected} title="Delete">
            <Icon name="trash" className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Width" suffix="cm" value={Math.round(o.w * 100)} min={5} max={1000} onCommit={(v) => resizeSelected({ w: v / 100 })} />
          <NumberField label="Depth" suffix="cm" value={Math.round(o.d * 100)} min={5} max={1000} onCommit={(v) => resizeSelected({ d: v / 100 })} />
          <NumberField label="Height" suffix="cm" value={Math.round(o.h * 100)} min={1} max={600} onCommit={(v) => resizeSelected({ h: v / 100 })} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              onClick={() => colorSelected(c)}
              className={`h-6 w-6 rounded-full ring-1 ring-black/10 ${o.color === c ? "outline-2 outline-offset-2 outline-accent" : ""}`}
              style={{ background: c }}
            />
          ))}
          <input type="color" value={o.color} onChange={(e) => colorSelected(e.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" aria-label="Custom colour" />
        </div>
      </fieldset>

      {mine.length > 0 && (
        <ul className="mt-3 space-y-1">
          {mine.map((i, k) => (
            <li key={k} className={`rounded-md px-2 py-1 text-xs ${i.severity === "error" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
              {i.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
