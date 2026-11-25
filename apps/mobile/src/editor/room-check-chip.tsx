import type { Rule } from "@buildit/core";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { Text } from "@/components/text";
import { formatNumber, isArabic, t } from "@/i18n";
import { color, rust, withAlpha } from "@/theme";
import { textStyle } from "@/theme/typography";
import { ruleText, topIssue } from "./check-copy";

const CIRC = 94.25; // 2π × radius 15

/**
 * The editor's room-check chip: the score in a gold ring and the first thing that needs attention, or that all rules pass.
 * An empty room has nothing to judge, so it shows no score (a free 100 would spend the reward before any work).
 */
export function RoomCheckChip({ score, rules, empty = false, onPress }: { score: number; rules: Rule[]; empty?: boolean; onPress: () => void }) {
  const issue = empty ? undefined : topIssue(rules);
  const note = empty ? t("chipEmpty") : issue ? ruleText(issue) : t("allOk");
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={empty ? `${t("check")}. ${note}` : `${t("check")}. ${formatNumber(score)}. ${note}`} hitSlop={{ top: 5, bottom: 5 }} onPress={onPress} style={styles.chip}>
      <Svg width={34} height={34} viewBox="0 0 36 36">
        <Circle cx={18} cy={18} r={15} fill="none" stroke={withAlpha(color.text, 0.14)} strokeWidth={2.5} />
        <Circle cx={18} cy={18} r={15} fill="none" stroke={color.accent} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={`${empty ? 0 : (score / 100) * CIRC} ${CIRC}`} transform="rotate(-90 18 18)" />
        <SvgText x={18} y={22.5} textAnchor="middle" fontSize={12} fontFamily={textStyle("label", isArabic()).fontFamily} fill={color.text}>{empty ? "–" : formatNumber(score)}</SvgText>
      </Svg>
      <View style={styles.words}>
        <Text variant="chipTitle">{t("check")}</Text>
        <Text variant="chipNote" numberOfLines={1} style={{ color: issue ? rust.dark : empty ? color.neutral700 : color.accent700 }}>{note}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  words: { flexShrink: 1 },
  chip: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 5, paddingStart: 5, paddingEnd: 14, borderRadius: 99, borderWidth: 1, borderColor: color.divider, backgroundColor: withAlpha(color.bg, 0.92) },
});
