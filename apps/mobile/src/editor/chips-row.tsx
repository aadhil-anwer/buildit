import { Pressable, StyleSheet, View } from "react-native";
import { Icon } from "@/components/icon";
import { Segmented } from "@/components/segmented";
import { t } from "@/i18n";
import { color, withAlpha } from "@/theme";
import { RoomCheckChip } from "./room-check-chip";
import { useEditor, useScene } from "./store";
import { useRoomCheck } from "./use-room-check";

/** The row over the room: the room-check chip, the walking-space toggle and the 3D / Plan switch. */
export function ChipsRow() {
  const scene = useScene();
  const { score, rules } = useRoomCheck(scene);
  const [view, walk] = [useEditor((s) => s.view), useEditor((s) => s.walk)];
  const { setTab, setView, setWalk } = useEditor.getState();
  return (
    <View style={styles.row}>
      <RoomCheckChip score={score} rules={rules} onPress={() => setTab("check")} />
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("walkToggle")} accessibilityState={{ selected: walk }} hitSlop={3} onPress={() => setWalk(!walk)} style={[styles.walk, walk && styles.walkOn]}>
          <Icon name="walk" tint={walk ? color.accent : color.text} />
        </Pressable>
        <Segmented floating options={[{ key: "3d", label: t("v3d") }, { key: "plan", label: t("vplan") }]} value={view} onChange={setView} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  controls: { flexDirection: "row", alignItems: "center", gap: 8 },
  walk: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: color.divider, backgroundColor: withAlpha(color.bg, 0.92), alignItems: "center", justifyContent: "center" },
  walkOn: { borderColor: color.accent, backgroundColor: color.accent100 },
});
