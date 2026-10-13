import type { Scene } from "@buildit/core";
import { useMemo } from "react";
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

/** Whether the AI designer is working, and which pieces it has changed so far (from the steps it has really taken). */
export function useDrafting() {
  const on = useAsk((s) => s.phase.name === "running");
  const preview = useEditor((s) => s.preview);
  const present = useEditor((s) => s.history?.present);
  const touched = useMemo(() => (on && preview && present ? touchedIds(present, preview) : []), [on, preview, present]);
  return { on, touched };
}
