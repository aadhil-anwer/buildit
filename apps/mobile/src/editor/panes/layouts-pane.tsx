import { inferKind } from "@buildit/core";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { report } from "@/lib/report";
import { CARD_WIDTH, LayoutCard } from "../layout-card";
import { LayoutsCompare } from "../layouts-compare";
import { useLayouts, type Same } from "../layouts-store";
import { useEditor } from "../store";
import { traditionName } from "../tradition-copy";

/** "Other layouts": the room's furniture arranged by each idea, as cards to look at (in 3D) or side by side. Using one hands the room back (onUsed). */
export function LayoutsPane({ onUsed }: { onUsed?: () => void } = {}) {
  const present = useEditor((s) => s.history!.present);
  const roomId = useEditor((s) => s.roomId ?? "");
  const { phase, layouts, same, active, qibla } = useLayouts();
  const ctx = useMemo(() => ({ qibla: qibla[roomId] }), [qibla, roomId]);
  const [view, setView] = useState<"cards" | "compare">("cards");
  const kind = inferKind(present);
  useEffect(() => {
    if (kind) useLayouts.getState().open().catch((e: unknown) => report(e, { source: "layouts" }));
    return () => useLayouts.getState().close(); // leaving the pane puts the room back as it is
  }, [kind]);
  if (!kind) return <Text variant="bodySm" tone="secondary">{t("layoutsNoKind")}</Text>;
  const { look, use, setQibla } = useLayouts.getState();
  return (
    <View>
      <Text variant="paneTitle">{t("layoutsH")}</Text>
      <Text variant="caption" tone="secondary" style={styles.sub}>{t("layoutsSub")}</Text>
      {phase.name === "arranging" ? <Text variant="bodySm" tone="secondary" accessibilityLiveRegion="polite" style={styles.working}>{t("layoutsWorking", traditionName(phase.doing))}</Text> : null}
      {layouts.length ? (
        <>
          <Segmented options={[{ key: "cards", label: t("layoutsCards") }, { key: "compare", label: t("layoutsCompare") }]} value={view} onChange={setView} />
          {view === "compare" ? (
            <View style={styles.compare}><LayoutsCompare current={present} layouts={layouts} ctx={ctx} /></View>
          ) : (
            <ScrollView horizontal snapToInterval={CARD_WIDTH + 12} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
              <LayoutCard scene={present} tradition={null} ctx={ctx} active={active === -1} onLook={() => look(-1)} />
              {layouts.map((a, i) => (
                <LayoutCard key={a.tradition} scene={a.scene} tradition={a.tradition} ctx={ctx} active={active === i} onLook={() => look(i)} onUse={() => { use(i); onUsed?.(); }}
                  onQibla={a.tradition === "arabian" ? (wall) => void setQibla(wall).catch((e: unknown) => report(e, { source: "qibla" })) : undefined} />
              ))}
            </ScrollView>
          )}
        </>
      ) : null}
      {same.map((x) => <SameLine key={x.tradition} same={x} />)}
      <Text variant="caption" tone="secondary" style={styles.note}>{t("layoutsNote")}</Text>
    </View>
  );
}

/** An idea whose best layout is the room as it is, or a card already shown: one line instead of a twin card. */
const SameLine = ({ same: x }: { same: Same }) => (
  <Text variant="bodySm" tone="secondary" style={styles.same}>
    {x.as ? t("layoutsSameAs", traditionName(x.tradition), traditionName(x.as)) : t("layoutsNoBetter", traditionName(x.tradition))}
  </Text>
);

const styles = StyleSheet.create({
  sub: { marginTop: 2, marginBottom: 12 },
  cards: { gap: 12, paddingVertical: 12, paddingEnd: 20, alignItems: "flex-start" }, // each card as tall as its own content
  compare: { marginTop: 12 },
  note: { marginTop: 8 },
  same: { marginBottom: 4 },
  working: { marginBottom: 10 },
});
