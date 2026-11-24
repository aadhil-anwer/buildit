import { StyleSheet, View } from "react-native";
import { captureSupport } from "@/capture/support";
import { Text } from "@/components/text";
import { formatNumber, t } from "@/i18n";
import { color } from "@/theme";

const WAYS = [
  ["lidar", "way1t", "way1d"],
  ["guided", "way2t", "way2d"],
  ["dimensions", "way3t", "way3d"],
] as const;

/** First launch: what the app does and the ways to get a room in that this build can run. */
export function EmptyState() {
  const support = captureSupport();
  const ways = WAYS.filter(([id]) => id === "dimensions" || support[id]).map(([, title, detail]) => [title, detail] as const);
  return (
    <View style={styles.root}>
      <Text variant="section" style={styles.heading}>{t("emptyH")}</Text>
      <Text variant="bodySm" tone="secondary" style={styles.intro}>{t(ways.length > 1 ? "emptyP" : "emptyPTyped")}</Text>
      {ways.map(([title, detail], i) => (
        <View key={title} style={styles.way}>
          <Text variant="numeral" style={styles.numeral}>{formatNumber(i + 1)}</Text>
          <View style={styles.copy}>
            <Text variant="wayTitle" style={styles.wayTitle}>{t(title)}</Text>
            <Text variant="small" tone="secondary">{t(detail)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 18, paddingHorizontal: 24, paddingBottom: 150 },
  heading: { marginBottom: 8 },
  intro: { marginBottom: 22 },
  way: { flexDirection: "row", gap: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: color.divider },
  numeral: { width: 26, color: color.accent600, fontVariant: ["tabular-nums"] },
  copy: { flex: 1 },
  wayTitle: { marginBottom: 4 },
});
