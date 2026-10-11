import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { color, radius, space, withAlpha } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

// Outlined, never filled (design system). Labels use accent700 so they pass AA.
const VARIANT = {
  primary: { border: color.accent, tone: "accent", press: withAlpha(color.accent, 0.22) },
  secondary: { border: color.divider, tone: "default", press: withAlpha(color.text, 0.14) },
  ghost: { border: "transparent", tone: "accent", press: withAlpha(color.accent, 0.18) },
} as const;

type Props = {
  title: string;
  onPress?: () => void;
  variant?: keyof typeof VARIANT;
  icon?: Parameters<typeof Icon>[0]["name"];
  disabled?: boolean;
  /** Work in progress: ignores taps and announces itself as busy. No spinner (design rule). */
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = "primary", icon, disabled, busy, style }: Props) {
  const v = VARIANT[variant];
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [styles.base, { borderColor: v.border, opacity: inactive ? 0.45 : 1 }, pressed && { backgroundColor: v.press }, style]}
    >
      {icon && <Icon name={icon} size={20} tint={color.accent} />}
      <Text variant="button" tone={v.tone}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44, // tap target
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: space[2],
    paddingHorizontal: space[3] * 1.2,
    borderWidth: 1,
    borderRadius: radius.md,
  },
});
