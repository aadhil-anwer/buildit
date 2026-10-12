import { addObject, fits, getCatalogItem, largestFree } from "@buildit/core";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton } from "@/components/icon-button";
import { Text } from "@/components/text";
import { useToast } from "@/components/toast";
import { formatNumber, t } from "@/i18n";
import { typeName } from "@/rooms/names";
import { color, withAlpha } from "@/theme";
import { useEditor, useScene } from "../store";

// The pieces the design offers; sizes and colours come from the engine's catalog, never retyped here.
const OFFERED = ["rug_small", "armchair", "coffee_table_rect", "desk", "bookshelf"];

/** Generic furniture at real sizes. A piece that cannot fit is dimmed (or hidden with "Fits in this room"). */
export function AddPane() {
  const scene = useScene();
  const [onlyFits, setOnlyFits] = useState(false);
  const free = useMemo(() => largestFree(scene), [scene]);
  const rows = OFFERED.flatMap((id) => {
    const item = getCatalogItem(id);
    return item ? [{ item, fit: item.type === "rug" || fits(free, item.w, item.d) }] : [];
  }).filter((r) => !onlyFits || r.fit);

  const add = (id: string, name: string) => {
    if (!useEditor.getState().commit(addObject(scene, id))) useToast.getState().show(t("addNoFit", name));
  };

  return (
    <View>
      <View style={styles.head}>
        <Text variant="paneTitle">{t("addH")}</Text>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={t("fits")} accessibilityState={{ checked: onlyFits }} hitSlop={{ top: 14, bottom: 14 }} onPress={() => setOnlyFits(!onlyFits)} style={styles.fits}>
          <View style={[styles.box, onlyFits && styles.boxOn]} />
          <Text variant="caption">{t("fits")}</Text>
        </Pressable>
      </View>
      <Text variant="caption" tone="secondary" style={styles.sub}>{t("addSub")}</Text>
      {rows.map(({ item, fit }) => (
        <View key={item.id} style={[styles.row, !fit && styles.dim]}>
          <View style={styles.name}>
            <Text variant="heading">{typeName(item.type)}</Text>
            <Text variant="caption" tone="secondary" style={styles.size}>{`${formatNumber(Math.round(item.w * 100))} × ${formatNumber(Math.round(item.d * 100))} ${t("cm")}`}</Text>
          </View>
          <IconButton icon="plus" label={`${t("addH")}: ${typeName(item.type)}`} quiet onPress={() => add(item.id, typeName(item.type))} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 },
  fits: { flexDirection: "row", alignItems: "center", gap: 8 },
  box: { width: 16, height: 16, borderWidth: 1, borderColor: color.neutral500, borderRadius: 3 },
  boxOn: { borderColor: color.accent, backgroundColor: withAlpha(color.accent, 0.25) },
  sub: { marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: color.divider },
  dim: { opacity: 0.4 },
  name: { flex: 1 },
  size: { fontVariant: ["tabular-nums"] },
});
