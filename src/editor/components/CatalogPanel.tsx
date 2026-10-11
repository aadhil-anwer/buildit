"use client";

import { useMemo, useState } from "react";
import { CATALOG, typeInfo, type CatalogItem } from "@/core/catalog";
import { addFromCatalog } from "../actions";
import { useEditor } from "../store";

const GROUP_ORDER = ["Seating", "Tables", "Storage", "Beds", "Decor"] as const;

function Row({ item }: { item: CatalogItem }) {
  const aiBusy = useEditor((s) => s.aiBusy);
  return (
    <button
      type="button"
      disabled={aiBusy}
      onClick={() => addFromCatalog(item.id)}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-stone-100 disabled:opacity-50"
    >
      <span className="h-7 w-7 shrink-0 rounded-md ring-1 ring-black/10" style={{ background: item.color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-stone-800">{item.name}</span>
        <span className="block text-xs text-stone-500">
          {Math.round(item.w * 100)}×{Math.round(item.d * 100)} cm
          {item.seats ? ` · seats ${item.seats}` : ""}
          {item.capacity ? ` · for ${item.capacity}` : ""}
        </span>
      </span>
      {item.product && (
        <span className="text-right text-xs">
          <span className="block font-semibold text-stone-800">
            {item.product.price} {item.product.currency}
          </span>
          <span className="block text-stone-500">{item.product.shop}</span>
        </span>
      )}
    </button>
  );
}

export function CatalogPanel() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? CATALOG.filter((c) => `${c.name} ${c.type} ${c.product?.shop ?? ""}`.toLowerCase().includes(s)) : CATALOG;
  }, [q]);
  const products = filtered.filter((c) => c.product);
  const generic = filtered.filter((c) => !c.product);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-2 pt-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search furniture"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <p className="mt-2 text-xs text-stone-500">Tap to add. Drag in the room to move; R rotates; Delete removes.</p>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-4">
        {products.length > 0 && (
          <div className="mb-3">
            <h4 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">From shops</h4>
            {products.map((c) => (
              <Row key={c.id} item={c} />
            ))}
          </div>
        )}
        {GROUP_ORDER.map((g) => {
          const items = generic.filter((c) => typeInfo(c.type).group === g);
          if (!items.length) return null;
          return (
            <div key={g} className="mb-3">
              <h4 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">{g}</h4>
              {items.map((c) => (
                <Row key={c.id} item={c} />
              ))}
            </div>
          );
        })}
        {!filtered.length && <p className="px-2 text-sm text-stone-500">Nothing matches &ldquo;{q}&rdquo;.</p>}
      </div>
    </div>
  );
}
