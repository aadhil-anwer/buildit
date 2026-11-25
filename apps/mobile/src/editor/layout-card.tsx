import { roomCheck, traditionReport, type Compass, type Scene, type TraditionCtx, type TraditionId } from "@buildit/core";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { Icon } from "@/components/icon";
import { PlanView } from "@/components/plan-view";
import { Text } from "@/components/text";
import { formatNumber, t } from "@/i18n";
import { color, rust } from "@/theme";
import { ruleLine, traditionIdea, traditionName } from "./tradition-copy";

export const CARD_WIDTH = 284;
const WALLS: [Compass, "wallN" | "wallE" | "wallS" | "wallW"][] = [["north", "wallN"], ["east", "wallE"], ["south", "wallS"], ["west", "wallW"]];

interface Props {
  scene: Scene;
  /** null: the room as it is now. */
  tradition: TraditionId | null;
  ctx: TraditionCtx;
  active: boolean;
  onLook: () => void;
  onUse?: () => void;
  onQibla?: (wall: Compass) => void;
}

/** One layout: what it is, a small plan, the room-check score, and its tradition's rules with what was measured. */
export function LayoutCard({ scene, tradition, ctx, active, onLook, onUse, onQibla }: Props) {
  const score = useMemo(() => roomCheck(scene).score, [scene]);
  const rules = useMemo(() => (tradition ? traditionReport(scene, tradition, ctx).filter((r) => r.status !== "na") : []), [scene, tradition, ctx]);
  const passed = rules.filter((r) => r.status === "pass").length;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onLook} style={[styles.card, active && styles.active]}>
      <Text variant="heading">{tradition ? traditionName(tradition) : t("layoutsCurrent")}</Text>
      {tradition ? <Text variant="caption" tone="secondary" style={styles.idea}>{traditionIdea(tradition)}</Text> : null}
      <View style={styles.plan}><PlanView scene={scene} width={CARD_WIDTH - 34} height={120} pad={8} doors /></View>
      <View style={styles.meta}>
        <Text variant="label">{`${t("check")} ${formatNumber(score)}`}</Text>
        {rules.length ? <Text variant="label" tone="accent">{t("layoutsRules", formatNumber(passed), formatNumber(rules.length))}</Text> : null}
      </View>
      {rules.map((r) => (
        <View key={r.id} style={styles.rule}>
          <Icon name={r.status === "pass" ? "check" : "close"} size={14} tint={r.status === "pass" ? color.accent700 : rust.dark} />
          <Text variant="caption" style={styles.ruleText}>{ruleLine(r)}</Text>
        </View>
      ))}
      {onQibla ? (
        <View style={styles.qibla}>
          <Text variant="caption" tone="secondary">{t("qiblaQ")}</Text>
          <View style={styles.chips}>{WALLS.map(([wall, key]) => <Chip key={wall} label={t(key)} selected={ctx.qibla === wall} onPress={() => onQibla(wall)} />)}</View>
        </View>
      ) : null}
      {onUse ? <Button title={t("layoutsUse")} size={14} onPress={onUse} style={styles.use} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, padding: 16, borderWidth: 1, borderColor: color.divider, borderRadius: 4, backgroundColor: color.bg },
  active: { borderColor: color.accent },
  idea: { marginTop: 2 },
  plan: { marginVertical: 10, width: CARD_WIDTH - 34, height: 120 }, // the plan draws at 100% of this box
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rule: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingVertical: 3 },
  ruleText: { flex: 1 },
  qibla: { marginTop: 8, gap: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  use: { marginTop: 12 },
});
