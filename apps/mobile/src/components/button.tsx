import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { color, radius, rust, space, withAlpha } from "@/theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

// Outlined, never filled (design system). Labels use accent700 so they pass AA.
const VARIANT = {
  primary: { border: color.accent, tone: "accent", press: withAlpha(color.accent, 0.22) },
  secondary: { border: color.divider, tone: "default", press: withAlpha(color.text, 0.14) },
  ghost: { border: "transparent", tone: "accent", press: withAlpha(color.accent, 0.18) },
  danger: { border: rust.base, tone: "danger", press: withAlpha(rust.base, 0.14) },
} as const;

// Heights are the design's, never below the 44pt tap target.
// Sizes are named by the design's font size.
const SIZE = { 14: { height: 44, text: "button14" }, 15: { height: 44, text: "button15" }, 16: { height: 46, text: "button16" }, 17: { height: 50, text: "button17" } } as const;

type Props = {
  title: string;
  onPress?: () => void;
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  icon?: IconName;
  disabled?: boolean;
  /** Work in progress: ignores taps and announces itself as busy. No spinner (design rule). */
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = "primary", size = 14, icon, disabled, busy, style }: Props) {
  const v = VARIANT[variant];
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [styles.base, { minHeight: SIZE[size].height, borderColor: v.border, opacity: inactive ? 0.45 : 1 }, pressed && { backgroundColor: v.press }, style]}
    >
      {icon && <Icon name={icon} size={20} tint={color.accent} />}
      <Text variant={SIZE[size].text} tone={v.tone}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
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
