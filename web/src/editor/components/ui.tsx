"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong disabled:bg-stone-300",
  secondary: "bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 disabled:text-stone-400",
  ghost: "text-stone-700 hover:bg-stone-200/70 disabled:text-stone-300",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${pad} ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-b border-stone-200 px-4 py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-stone-600">
      {label}
      <div className="flex items-center rounded-md border border-stone-300 bg-white focus-within:border-accent">
        <input
          key={value}
          type="number"
          inputMode="decimal"
          defaultValue={value}
          min={min}
          max={max}
          step={step}
          className="w-full min-w-0 bg-transparent px-2 py-1 text-sm text-stone-900 outline-none"
          onBlur={(e) => {
            const v = Number(e.currentTarget.value);
            if (Number.isFinite(v) && v !== value && (min === undefined || v >= min) && (max === undefined || v <= max)) onCommit(v);
            else e.currentTarget.value = String(value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {suffix && <span className="pr-2 text-xs text-stone-400">{suffix}</span>}
      </div>
    </label>
  );
}

const paths: Record<string, string> = {
  undo: "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  redo: "m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  rotL: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  rotR: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  unlock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 7.5-2",
  wall: "M4 4v16M8 8h10v8H8z",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
  cube: "M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5M12 12v10",
  grid: "M3 3h18v18H3zM3 12h18M12 3v18",
  walk: "M13 4a2 2 0 1 0 0-.01M10 21l2-6 3 3v3M8 12l2-4 4 1 2 3M10 8l-2 5",
  x: "M18 6 6 18M6 6l12 12",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 3",
  room: "M3 10 12 3l9 7v11H3zM9 21v-6h6v6",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  sofa: "M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2zM5 18v2M19 18v2",
  upload: "M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M8 8l4-4 4 4M12 4v12",
  download: "M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M8 12l4 4 4-4M12 4v12",
};

export function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof paths | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={paths[name] ?? ""} />
    </svg>
  );
}
