import { inferKind } from "@buildit/core";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon } from "@/components/icon";
import { Segmented } from "@/components/segmented";
import { t } from "@/i18n";
import { color, withAlpha } from "@/theme";
import { RoomCheckChip } from "./room-check-chip";
import { ScoreDelta } from "./score-delta";
import { useFurnish } from "./furnish-store";
import { useEditor, useScene } from "./store";
import { useRoomCheck } from "./use-room-check";

/** The row over the room: the room-check chip, the walking-space toggle and the 3D / Plan switch. */
export function ChipsRow() {
  // While "furnish it for me" plays its reveal, the chip keeps the room as it was: half-placed frames would flash red.
  const furnishing = useFurnish((s) => s.phase.name !== "idle");
  const committed = useEditor((s) => s.history!.present);
  const live = useScene();
  const shown = furnishing ? committed : live;
  const { score, rules } = useRoomCheck(shown);
  const [view, walk, previewing] = [useEditor((s) => s.view), useEditor((s) => s.walk), useEditor((s) => !!s.preview)];
  const { setTab, setView, setWalk } = useEditor.getState();
  return (
    <View style={styles.row}>
      <View>
        <RoomCheckChip score={score} rules={rules} empty={shown.objects.length === 0} onPress={() => setTab("check")} />
        <ScoreDelta score={score} live={!previewing && shown.objects.length > 0} />
      </View>
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("walkToggle")} accessibilityState={{ selected: walk }} hitSlop={3} onPress={() => setWalk(!walk)} style={[styles.walk, walk && styles.walkOn]}>
          <Icon name="walk" tint={walk ? color.accent : color.text} />
        </Pressable>
        {inferKind(shown) ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("layoutsOpen")} hitSlop={3} onPress={() => setTab("layouts")} style={styles.walk}>
            <Icon name="layouts" />
          </Pressable>
        ) : null}
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
