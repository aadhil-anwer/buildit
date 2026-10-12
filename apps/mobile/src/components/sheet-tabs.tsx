import { Pressable, StyleSheet, View } from "react-native";
import { color } from "@/theme";
import { Text } from "./text";

export interface SheetTab<K extends string> {
  key: K;
  label: string;
}

/** The sheet's tab strip: the chosen tab is gold-underlined, the rest sit on a hairline. */
export function SheetTabs<K extends string>({ tabs, value, onChange }: { tabs: SheetTab<K>[]; value: K; onChange: (key: K) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.strip}>
      {tabs.map(({ key, label }) => {
        const on = key === value;
        return (
          <Pressable key={key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }} hitSlop={{ top: 4, bottom: 4 }} onPress={() => onChange(key)} style={[styles.tab, on && styles.on]}>
            <Text variant="tab" tone={on ? "accent" : "secondary"}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", gap: 2, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: color.divider },
  tab: { paddingTop: 11, paddingBottom: 10, paddingHorizontal: 12, marginBottom: -1, borderBottomWidth: 1.5, borderBottomColor: "transparent" },
  on: { borderBottomColor: color.accent },
});
