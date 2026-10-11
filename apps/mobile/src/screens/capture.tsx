import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { captureSupport } from "@/capture/support";
import { Icon } from "@/components/icon";
import { IconButton } from "@/components/icon-button";
import { Tag } from "@/components/tag";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { color } from "@/theme";

const METHODS = [
  { id: "lidar", title: "way1t", detail: "way1d", href: "/capture/lidar" },
  { id: "guided", title: "way2t", detail: "way2d", href: "/capture/guided" },
  { id: "dimensions", title: "way3t", detail: "way3d", href: "/capture/dimensions" },
] as const;

/** Choose how to get the room in. Only methods this build can run are offered; the first is recommended. */
export function Capture() {
  const router = useRouter();
  const insets = useScreenInsets();
  const support = captureSupport();
  const offered = METHODS.filter((m) => m.id === "dimensions" || support[m.id]);
  return (
    <View style={[styles.root, { paddingTop: insets.top - 4, paddingBottom: insets.bottom }]}>
      <View style={styles.back}>
        <IconButton icon="back" label={t("back")} onPress={() => router.back()} />
      </View>
      <Text variant="hero" style={styles.title}>{t("capH")}</Text>
      <View style={styles.sub}>
        {support.lidar ? <Icon name="check" size={16} tint={color.accent} /> : null}
        <Text variant="count" tone="secondary">{t(support.lidar ? "capSub" : "capSubNoScan")}</Text>
      </View>
      {offered.map((m, i) => (
        <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`${t(m.title)}. ${t(m.detail)}`} onPress={() => router.push(m.href)} style={i === 0 ? styles.card : styles.row}>
          <View style={styles.head}>
            <Text variant={i === 0 ? "cardTitle" : "rowTitle"}>{t(m.title)}</Text>
            {i === 0 ? <Tag>{t("rec")}</Tag> : null}
          </View>
          <Text variant="small" tone="secondary">{t(m.detail)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  back: { height: 48, flexDirection: "row", alignItems: "center" },
  title: { marginTop: 14, marginBottom: 8 },
  sub: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 26 },
  card: { borderWidth: 1, borderColor: color.accent, borderRadius: 4, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 20 },
  row: { paddingTop: 20, paddingHorizontal: 4, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: color.divider },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
});
