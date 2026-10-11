import { Text as NativeText, type TextProps } from "react-native";
import { isArabic } from "@/i18n";
import { color, rust } from "@/theme";
import { textStyle, type Variant } from "@/theme/typography";

// The plain accent fails AA as text, so accent text always uses the dark step.
const TONE = { default: color.text, secondary: color.neutral700, accent: color.accent700, danger: rust.dark };

/** `arabic` forces one script (a language name is always set in its own language); by default it follows the app language. */
export function Text({ variant = "body", tone = "default", arabic, style, ...props }: TextProps & { variant?: Variant; tone?: keyof typeof TONE; arabic?: boolean }) {
  return <NativeText {...props} style={[textStyle(variant, arabic ?? isArabic()), { color: TONE[tone] }, style]} />;
}
