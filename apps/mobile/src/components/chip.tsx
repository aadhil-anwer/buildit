import { Pressable, StyleSheet } from "react-native";
import { color, space } from "@/theme";
import { Text } from "./text";

/** Pill with a hairline; selection is drawn as an accent stroke, not a fill. */
export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 2, bottom: 2 }} // 40 + 4 = 44pt tap target
      onPress={onPress}
      style={[styles.base, { borderColor: selected ? color.accent : color.divider }]}
    >
      <Text variant="label" tone={selected ? "accent" : "default"}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 40, justifyContent: "center", paddingHorizontal: space[3], borderWidth: 1, borderRadius: 99 },
});
