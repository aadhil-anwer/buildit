import { Pressable, StyleSheet } from "react-native";
import { color, withAlpha } from "@/theme";
import { Icon, type IconName } from "./icon";

/** A 40px round button holding one icon. `quiet` drops the hairline. */
export function IconButton({ icon, label, onPress, quiet, disabled }: { icon: IconName; label: string; onPress?: () => void; quiet?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={2} // 40 + 4 = 44pt tap target
      onPress={onPress}
      style={({ pressed }) => [styles.base, { borderColor: quiet ? "transparent" : color.divider, opacity: disabled ? 0.3 : 1 }, pressed && { backgroundColor: withAlpha(color.text, 0.07) }]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
