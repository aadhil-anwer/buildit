import { essentials, inferKind, type Scene } from "@buildit/core";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/toast";
import { t } from "@/i18n";
import { haptic } from "@/lib/haptics";
import { useFurnish } from "./furnish-store";
import { useEditor } from "./store";

/** Missing essentials for the room's kind, or null while the room has no kind yet. */
export const missingCount = (scene: Scene) => {
  const kind = inferKind(scene);
  return kind ? essentials(scene, kind).missing.length : null;
};

/** Says so, once, when the person's own change puts the last essential in. Not on opening the room, not during previews. */
export function useRoomComplete() {
  const present = useEditor((s) => s.history?.present);
  const previewing = useEditor((s) => !!s.preview);
  const was = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (!present || previewing) return;
    const now = missingCount(present);
    const before = was.current;
    was.current = now;
    if (before === undefined || useFurnish.getState().quiet) return; // first look at the room, or the furnishing just finished (it has its own message)
    if (now === 0 && before !== null && before > 0) {
      haptic.win();
      useToast.getState().show(t("roomComplete"));
    }
  }, [present, previewing]);
}
