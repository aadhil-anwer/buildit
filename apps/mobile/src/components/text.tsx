import { I18nManager, Text as NativeText, type TextProps } from "react-native";
import { color, rust } from "@/theme";
import { textStyle, type Variant } from "@/theme/typography";

// The plain accent fails AA as text, so accent text always uses the dark step.
const TONE = { default: color.text, secondary: color.neutral700, accent: color.accent700, danger: rust.dark };

export function Text({ variant = "body", tone = "default", style, ...props }: TextProps & { variant?: Variant; tone?: keyof typeof TONE }) {
  return <NativeText {...props} style={[textStyle(variant, I18nManager.isRTL), { color: TONE[tone] }, style]} />;
}
