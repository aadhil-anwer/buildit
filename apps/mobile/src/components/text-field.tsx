import { useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { isArabic } from "@/i18n";
import { color, radius } from "@/theme";
import { textStyle } from "@/theme/typography";
import { Text } from "./text";

/** A labelled input: hairline border, accent when focused, error text underneath (design system .field and .input). */
export function TextField({ label, error, style, ...input }: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text variant="caption" tone="secondary">{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        cursorColor={color.accent}
        selectionColor={color.accent}
        placeholderTextColor={color.neutral600}
        onFocus={(e) => (setFocused(true), input.onFocus?.(e))}
        onBlur={(e) => (setFocused(false), input.onBlur?.(e))}
        style={[styles.input, textStyle("bodySm", isArabic()), { borderColor: focused ? color.accent : color.divider }, style]}
      />
      {error ? <Text variant="caption" tone="danger" accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 5 },
  input: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, color: color.text, borderWidth: 1, borderRadius: radius.md },
});
