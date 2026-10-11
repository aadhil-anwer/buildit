import { StyleSheet, View } from "react-native";
import { isArabic } from "@/i18n";
import { color } from "@/theme";
import { Text } from "./text";

/** A small accent-tinted label (design system .tag-accent), e.g. "Recommended". */
export function Tag({ children }: { children: string }) {
  return (
    <View style={styles.box}>
      <Text variant="tag" style={{ color: color.accent800, letterSpacing: isArabic() ? 0 : 0.22 }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 3, backgroundColor: color.accent100 },
});
