import { design, setFinish } from "@buildit/core";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/text";
import { t, type StringKey } from "@/i18n";
import { color } from "@/theme";
import { useEditor, useScene } from "../store";

const WALL_NAME: Record<keyof typeof design.materials.wall, StringKey> = { chalk: "cChalk", sand: "cSand", sage: "cSage", clay: "cClay", stone: "cStone", ink: "cInk" };
const FLOOR_NAME: Record<keyof typeof design.materials.floor, StringKey> = { oak: "fOak", walnut: "fWalnut", ash: "fAsh", stone: "fStone", concrete: "fConcrete" };

interface SwatchProps {
  name: string;
  hex: string;
  on: boolean;
  round: boolean;
  width: number;
  onPress: () => void;
}

function Swatch({ name, hex, on, round, width, onPress }: SwatchProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: on }} onPress={onPress} style={[styles.cell, { width }]}>
      <View style={[styles.swatch, { backgroundColor: hex, borderRadius: round ? 21 : 3 }, on && styles.on]} />
      <Text variant="tag" tone="secondary" style={styles.name}>{name}</Text>
    </Pressable>
  );
}

/** Wall and floor finishes, one tap each. The current one is outlined in gold. */
export function FinishesPane() {
  const scene = useScene();
  const apply = (finish: Parameters<typeof setFinish>[1]) => useEditor.getState().commit(setFinish(scene, finish));
  return (
    <View>
      <Text variant="paneTitle" style={styles.title}>{t("wallsH")}</Text>
      <View style={styles.row}>
        {(Object.keys(WALL_NAME) as (keyof typeof WALL_NAME)[]).map((key) => (
          <Swatch key={key} name={t(WALL_NAME[key])} hex={design.materials.wall[key]} on={scene.room.wallColor === design.materials.wall[key]} round width={52} onPress={() => apply({ wall_color: design.materials.wall[key] })} />
        ))}
      </View>
      <Text variant="paneTitle" style={[styles.title, styles.floor]}>{t("floorH")}</Text>
      <View style={styles.row}>
        {(Object.keys(FLOOR_NAME) as (keyof typeof FLOOR_NAME)[]).map((key) => (
          <Swatch key={key} name={t(FLOOR_NAME[key])} hex={design.materials.floor[key]} on={scene.room.floorColor === design.materials.floor[key]} round={false} width={60} onPress={() => apply({ floor_color: design.materials.floor[key] })} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 },
  floor: { marginTop: 20 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { alignItems: "center", gap: 6 },
  swatch: { width: 42, height: 42, borderWidth: 1, borderColor: color.divider },
  on: { outlineWidth: 1.5, outlineColor: color.accent, outlineOffset: 3, outlineStyle: "solid" },
  name: { textAlign: "center" },
});
