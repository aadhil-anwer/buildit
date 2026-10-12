import type { Rule } from "@buildit/core";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { Text } from "@/components/text";
import { formatNumber, t } from "@/i18n";
import { color, rust, withAlpha } from "@/theme";
import { ruleText, topIssue } from "./check-copy";

const CIRC = 94.25; // 2π × radius 15

/** The editor's room-check chip: the score in a gold ring and the first thing that needs attention, or that all rules pass. */
export function RoomCheckChip({ score, rules, onPress }: { score: number; rules: Rule[]; onPress: () => void }) {
  const issue = topIssue(rules);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${t("check")}. ${formatNumber(score)}. ${issue ? ruleText(issue) : t("allOk")}`} hitSlop={{ top: 5, bottom: 5 }} onPress={onPress} style={styles.chip}>
      <Svg width={34} height={34} viewBox="0 0 36 36">
        <Circle cx={18} cy={18} r={15} fill="none" stroke={withAlpha(color.text, 0.14)} strokeWidth={2.5} />
        <Circle cx={18} cy={18} r={15} fill="none" stroke={color.accent} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={`${(score / 100) * CIRC} ${CIRC}`} transform="rotate(-90 18 18)" />
        <SvgText x={18} y={22.5} textAnchor="middle" fontSize={12} fontWeight="600" fill={color.text}>{formatNumber(score)}</SvgText>
      </Svg>
      <View>
        <Text variant="chipTitle">{t("check")}</Text>
        <Text variant="chipNote" style={{ color: issue ? rust.dark : color.accent700 }}>{issue ? ruleText(issue) : t("allOk")}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 5, paddingStart: 5, paddingEnd: 14, borderRadius: 99, borderWidth: 1, borderColor: color.divider, backgroundColor: withAlpha(color.bg, 0.92) },
});
