import { roomCheck, TRADITIONS, traditionReport, type Arrangement, type Scene, type TraditionCtx, type TraditionId } from "@buildit/core";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/text";
import { formatNumber, t } from "@/i18n";
import { color } from "@/theme";
import { traditionName } from "./tradition-copy";

const JUDGED = TRADITIONS.filter((x) => x !== "practical");

/** "3/4": how many of a tradition's rules that apply here a layout passes. */
function tally(scene: Scene, tradition: TraditionId, ctx: TraditionCtx) {
  const rules = traditionReport(scene, tradition, ctx).filter((r) => r.status !== "na");
  return rules.length ? `${formatNumber(rules.filter((r) => r.status === "pass").length)}/${formatNumber(rules.length)}` : "–";
}

/** Every layout judged by every idea, side by side: the room check, then each tradition's rules passed. */
export function LayoutsCompare({ current, layouts, ctx }: { current: Scene; layouts: Arrangement[]; ctx: TraditionCtx }) {
  const rows = useMemo(
    () => [{ name: t("layoutsCurrent"), scene: current }, ...layouts.map((a) => ({ name: traditionName(a.tradition), scene: a.scene }))].map((r) => ({
      name: r.name,
      cells: [formatNumber(roomCheck(r.scene).score), ...JUDGED.map((x) => tally(r.scene, x, ctx))],
    })),
    [current, layouts, ctx],
  );
  const head = [t("check"), ...JUDGED.map(traditionName)];
  return (
    <View accessibilityRole="summary">
      <View style={[styles.row, styles.head]}>
        <View style={styles.name} />
        {head.map((h) => <Text key={h} variant="caption" tone="secondary" numberOfLines={2} style={styles.cell}>{h}</Text>)}
      </View>
      {rows.map((r) => (
        <View key={r.name} style={styles.row}>
          <Text variant="label" numberOfLines={2} style={styles.name}>{r.name}</Text>
          {r.cells.map((c, i) => <Text key={head[i]} variant="label" style={[styles.cell, styles.num]}>{c}</Text>)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderTopWidth: 1, borderTopColor: color.divider },
  head: { borderTopWidth: 0, alignItems: "flex-end" },
  name: { width: 92 },
  cell: { flex: 1, textAlign: "center" },
  num: { fontVariant: ["tabular-nums"] },
});
