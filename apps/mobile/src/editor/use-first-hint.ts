import { useEffect } from "react";
import { useToast } from "@/components/toast";
import { t } from "@/i18n";
import { useHints } from "@/lib/hints";

/** The first time the editor opens on this phone, say once how to move a piece and turn the room. */
export function useFirstHint() {
  const seen = useHints((s) => s.seen.editorMove);
  useEffect(() => {
    if (seen) return;
    const timer = setTimeout(() => {
      useToast.getState().show(t("hintEditorMove"));
      useHints.getState().see("editorMove");
    }, 1200);
    return () => clearTimeout(timer);
  }, [seen]);
}
