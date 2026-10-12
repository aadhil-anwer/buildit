import type { Rule } from "@buildit/core";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { formatNumber, t, type StringKey } from "@/i18n";
import { typeName } from "@/rooms/names";
import { color, rust, withAlpha } from "@/theme";
import { useScene } from "../store";
import { useRoomCheck } from "../use-room-check";

const CIRC = 94.25;

function ruleLine(rule: Rule, itemName: string): string {
  const ok = rule.status === "pass";
  const keys: Record<Rule["id"], [StringKey, StringKey]> = { walkway: ["rWalkOk", "rWalk"], door: ["rDoorOk", "rDoor"], bed: ["rSideOk", "rSide"], storage: ["rStorOk", "rStor"], light: ["rLightOk", "rLight"] };
  const key = keys[rule.id][ok ? 0 : 1];
  return rule.id === "door" ? t(key as "rDoor", itemName) : t(key as "rWalk", rule.cm ?? 0);
}

/** The score and each rule behind it in a sentence, with a Fix on any that is not passing. */
export function CheckPane({ onFix, fixing }: { onFix: () => void; fixing: boolean }) {
  const scene = useScene();
  const { score, rules } = useRoomCheck(scene);
  return (
    <View>
      <View style={styles.top}>
        <Svg width={64} height={64} viewBox="0 0 36 36">
          <Circle cx={18} cy={18} r={15} fill="none" stroke={withAlpha(color.text, 0.12)} strokeWidth={1.6} />
          <Circle cx={18} cy={18} r={15} fill="none" stroke={color.accent} strokeWidth={1.6} strokeLinecap="round" strokeDasharray={`${(score / 100) * CIRC} ${CIRC}`} transform="rotate(-90 18 18)" />
        </Svg>
        <View>
          <Text variant="display" style={styles.score}>{formatNumber(score)}</Text>
          <Text variant="count" tone="secondary">{t("check")}</Text>
        </View>
      </View>
      {rules.map((rule) => {
        const piece = scene.objects.find((o) => o.id === rule.objectIds[0]);
        return (
          <View key={rule.id} style={styles.rule}>
            <Icon name={rule.status === "pass" ? "check" : "dot"} size={18} tint={rule.status === "fail" ? rust.base : color.accent} />
            <Text variant="bodySm" style={styles.text}>{ruleLine(rule, piece ? typeName(piece.type) : "")}</Text>
            {rule.status !== "pass" ? <Button title={t("fix")} size={14} busy={fixing} onPress={onFix} style={styles.fix} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 },
  score: { fontVariant: ["tabular-nums"] },
  rule: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: color.divider },
  text: { flex: 1 },
  fix: { minHeight: 44 },
});
