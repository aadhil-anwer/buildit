import { essentials, inferKind } from "@buildit/core";
import { StyleSheet, View } from "react-native";
import { Chip } from "@/components/chip";
import { Text } from "@/components/text";
import { formatNumber, t } from "@/i18n";
import { report } from "@/lib/report";
import { typeName } from "@/rooms/names";
import { color } from "@/theme";
import { useFurnish } from "./furnish-store";
import { useScene } from "./store";

/** What this kind of room needs, what is already in, and a one-tap way to add each missing piece where it belongs. */
export function EssentialsRow() {
  const scene = useScene();
  const kind = inferKind(scene);
  if (!kind) return null;
  const { done, missing } = essentials(scene, kind);
  const total = done.length + missing.length;
  const add = (type: (typeof missing)[number]) => void useFurnish.getState().addEssential(kind, type).catch((e: unknown) => report(e, { source: "essential", type }));
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text variant="kicker" tone="secondary">{t("essentialsH")}</Text>
        <Text variant="caption" tone={missing.length ? "secondary" : "accent"}>{t("essentialsCount", formatNumber(done.length), formatNumber(total))}</Text>
      </View>
      <View style={styles.bar}><View style={[styles.fill, { width: `${(done.length / total) * 100}%` }]} /></View>
      <View style={styles.chips}>
        {done.map((type) => <Chip key={type} label={typeName(type)} selected />)}
        {missing.map((type) => <Chip key={type} label={t("essentialAdd", typeName(type))} onPress={() => add(type)} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: color.divider },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  bar: { height: 2, marginTop: 8, marginBottom: 10, backgroundColor: color.divider },
  fill: { height: 2, backgroundColor: color.accent },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
