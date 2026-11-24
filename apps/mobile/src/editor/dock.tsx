import { Pressable, StyleSheet, View } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { color } from "@/theme";
import type { EditorTab } from "./store";

const ITEMS: { key: Exclude<EditorTab, "check">; icon: IconName }[] = [
  { key: "tAsk", icon: "ask" },
  { key: "tAdd", icon: "plus" },
  { key: "tItem", icon: "sliders" },
  { key: "tFin", icon: "palette" },
];

/** Height of the dock above the home indicator. */
export const DOCK_HEIGHT = 60;

/** The editor's bottom bar: four large buttons that open their panel; the open one is gold, and tapping it again closes the panel. */
export function Dock({ open, onPress, inset }: { open: EditorTab | null; onPress: (tab: EditorTab) => void; inset: number }) {
  return (
    <View accessibilityRole="tablist" style={[styles.dock, { height: DOCK_HEIGHT + inset, paddingBottom: inset }]}>
      {ITEMS.map(({ key, icon }) => {
        const on = key === open;
        return (
          <Pressable key={key} accessibilityRole="tab" accessibilityLabel={t(key)} accessibilityState={{ selected: on }} onPress={() => onPress(key)} style={styles.item}>
            <Icon name={icon} size={22} tint={on ? color.accent : color.text} />
            <Text variant="caption" tone={on ? "accent" : "secondary"}>{t(key)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { position: "absolute", start: 0, end: 0, bottom: 0, zIndex: 30, flexDirection: "row", borderTopWidth: 1, borderTopColor: color.divider, backgroundColor: color.bg },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 44 },
});
