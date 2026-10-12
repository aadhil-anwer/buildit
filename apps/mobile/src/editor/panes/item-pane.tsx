import { removeObject, rotateObject, setColor, setLocked } from "@buildit/core";
import { Pressable, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Text } from "@/components/text";
import { useToast } from "@/components/toast";
import { formatNumber, t } from "@/i18n";
import { typeName } from "@/rooms/names";
import { color } from "@/theme";
import { useEditor, useScene, useSelected } from "../store";

// The design's six furniture colours.
const PALETTE = ["#a6ad9b", "#b88d62", "#d6cdbf", "#b0765a", "#8c8f93", "#4b4a48"];

/** The selected piece: its colour, a quarter turn, lock and delete. Says so when nothing is selected. */
export function ItemPane() {
  const scene = useScene();
  const piece = useSelected();
  if (!piece) return <Text variant="bodySm" tone="secondary" style={styles.empty}>{t("itemEmpty")}</Text>;

  const run = (result: ReturnType<typeof setColor>) => {
    if (!useEditor.getState().commit(result)) useToast.getState().show(t("itemRefused", typeName(piece.type)));
  };
  return (
    <View>
      <View style={styles.head}>
        <Text variant="dialogTitle">{typeName(piece.type)}</Text>
        <Text variant="count" tone="secondary" style={styles.size}>{`${formatNumber(Math.round(piece.w * 100))} × ${formatNumber(Math.round(piece.d * 100))} ${t("cm")}`}</Text>
      </View>
      <Text variant="kicker" tone="secondary" style={styles.kicker}>{t("colour")}</Text>
      <View style={styles.swatches}>
        {PALETTE.map((c) => (
          <Pressable key={c} accessibilityRole="button" accessibilityLabel={c} accessibilityState={{ selected: piece.color === c }} hitSlop={5} onPress={() => run(setColor(scene, [piece.id], c))} style={[styles.swatch, { backgroundColor: c }, piece.color === c && styles.on]} />
        ))}
      </View>
      <View style={styles.actions}>
        <Button title={t("rotate")} icon="rotate" variant="secondary" disabled={!!piece.locked} onPress={() => run(rotateObject(scene, piece.id, { by_degrees: 90 }))} style={styles.grow} />
        <Button title={piece.locked ? t("unlock") : t("lock")} icon={piece.locked ? "unlock" : "lock"} variant="secondary" onPress={() => run(setLocked(scene, piece.id, !piece.locked))} style={styles.grow} />
        <Button title={t("delete")} icon="delete" iconOnly variant="secondary" disabled={!!piece.locked} onPress={() => run(removeObject(scene, piece.id))} style={styles.trash} />
      </View>
      {piece.locked ? <Text variant="caption" tone="secondary" style={styles.note}>{t("lockedNote")}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 20 },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  size: { fontVariant: ["tabular-nums"] },
  kicker: { marginTop: 18, marginBottom: 8 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: color.divider },
  on: { outlineWidth: 1.5, outlineColor: color.accent, outlineOffset: 3, outlineStyle: "solid" },
  actions: { flexDirection: "row", gap: 8, marginTop: 20 },
  grow: { flex: 1 },
  trash: { width: 48, paddingHorizontal: 0 },
  note: { marginTop: 12 },
});
