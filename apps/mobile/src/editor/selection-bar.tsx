import { removeObject, rotateObject, setLocked, type OpResult } from "@buildit/core";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Text } from "@/components/text";
import { useToast } from "@/components/toast";
import { t } from "@/i18n";
import { typeName } from "@/rooms/names";
import { color, shadow, withAlpha } from "@/theme";
import { useEditor, useScene, useSelected } from "./store";

/** The selected piece's quick actions, docked just above the sheet so turning or removing a chair never needs the sheet open. */
export function SelectionBar({ bottom }: { bottom: number }) {
  const scene = useScene();
  const piece = useSelected();
  if (!piece) return null;
  const run = (result: OpResult) => {
    if (!useEditor.getState().commit(result)) useToast.getState().show(t("itemRefused", typeName(piece.type)));
  };
  return (
    <View style={[styles.bar, { bottom }]}>
      <Text variant="bodySm" numberOfLines={1} style={styles.name}>{typeName(piece.type)}</Text>
      <Button title={t("rotate")} icon="rotate" iconOnly variant="secondary" disabled={!!piece.locked} onPress={() => run(rotateObject(scene, piece.id, { by_degrees: 90 }))} style={styles.btn} />
      <Button title={piece.locked ? t("unlock") : t("lock")} icon={piece.locked ? "unlock" : "lock"} iconOnly variant="secondary" onPress={() => run(setLocked(scene, piece.id, !piece.locked))} style={styles.btn} />
      <Button title={t("delete")} icon="delete" iconOnly variant="secondary" disabled={!!piece.locked} onPress={() => run(removeObject(scene, piece.id))} style={styles.btn} />
      <Button title={t("dismiss")} icon="close" iconOnly variant="ghost" onPress={() => useEditor.getState().select(null)} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", alignSelf: "center", zIndex: 24, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: color.divider, borderRadius: 4, backgroundColor: withAlpha(color.bg, 0.97), boxShadow: shadow.md },
  name: { maxWidth: 110, marginEnd: 4 },
  btn: { width: 44, paddingHorizontal: 0 },
});
