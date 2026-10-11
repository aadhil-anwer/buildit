import { Pressable, StyleSheet, View } from "react-native";
import { isArabic, setLanguage, t, type Lang } from "@/i18n";
import { useFail } from "@/lib/use-fail";
import { color, withAlpha } from "@/theme";
import { Text } from "./text";

const OPTIONS: { lang: Lang; label: "langEn" | "langAr" }[] = [{ lang: "en", label: "langEn" }, { lang: "ar", label: "langAr" }];

/** The English | العربية pill. Switching saves the choice and reloads the app into the new direction. */
export function LanguageToggle() {
  const fail = useFail();
  const current: Lang = isArabic() ? "ar" : "en";
  return (
    <View style={styles.pill}>
      {OPTIONS.map(({ lang, label }) => {
        const on = lang === current;
        return (
          <Pressable
            key={lang}
            accessibilityRole="button"
            accessibilityLabel={t(label)}
            accessibilityState={{ selected: on }}
            hitSlop={{ top: 7, bottom: 7 }} // 30 + 14 = 44pt tap target
            onPress={() => void (on ? undefined : setLanguage(lang).catch(fail))}
            style={[styles.option, on && styles.on]}
          >
            <Text variant="control" arabic={lang === "ar"} tone={on ? "accent" : "default"}>{t(label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", gap: 2, padding: 2, borderWidth: 1, borderColor: color.divider, borderRadius: 99 },
  option: { justifyContent: "center", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99 },
  on: { backgroundColor: withAlpha(color.accent, 0.16) },
});
