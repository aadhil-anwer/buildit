import type { Scene } from "@buildit/core";
import { useMemo } from "react";
import { useFurnish } from "@/editor/furnish-store";
import { useEditor } from "@/editor/store";
import { useAsk } from "./ask-store";

/** The pieces that are new or in a different place in `after` than in `before`. */
export function touchedIds(before: Scene, after: Scene): string[] {
  const was = new Map(before.objects.map((o) => [o.id, o]));
  return after.objects.filter((o) => {
    const b = was.get(o.id);
    return !b || b.x !== o.x || b.z !== o.z || b.rotation !== o.rotation || b.color !== o.color;
  }).map((o) => o.id);
}

/** Whether the AI designer (or "furnish it for me") is working, and which pieces it has changed so far (from the steps it has really taken). */
export function useDrafting() {
  const asking = useAsk((s) => s.phase.name === "running");
  const furnishing = useFurnish((s) => s.phase.name === "revealing");
  const on = asking || furnishing;
  const preview = useEditor((s) => s.preview);
  const present = useEditor((s) => s.history?.present);
  const touched = useMemo(() => (on && preview && present ? touchedIds(present, preview) : []), [on, preview, present]);
  return { on, touched };
}
