import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import hero from "../../assets/hero.png";
import { signInAnonymously } from "@/auth/auth";
import { useAuthAction } from "@/auth/use-auth-action";
import { Button } from "@/components/button";
import { LanguageToggle } from "@/components/language-toggle";
import { Plate } from "@/components/plate";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { color } from "@/theme";

// Continue with Apple joins these when Sign in with Apple is configured (OPEN_ISSUES.md).
export function Welcome() {
  const router = useRouter();
  const insets = useScreenInsets();
  const { run, message, busy } = useAuthAction();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text variant="brand">{t("brand")}</Text>
        <LanguageToggle />
      </View>
      <Plate style={styles.hero}>
        {/* eslint-disable-next-line no-restricted-syntax -- expo-image only offers physical keys; 50% is symmetric, so RTL is unaffected */}
        <Image source={hero} contentFit="cover" contentPosition={{ top: "45%", left: "50%" }} style={styles.image} accessible={false} />
      </Plate>
      <View>
        <Text variant="hero" style={styles.title}>{t("wTitle")}</Text>
        <Text variant="bodySm" tone="secondary">{t("wSub")}</Text>
      </View>
      <View style={styles.actions}>
        {message ? <Text variant="bodySm" tone="danger" accessibilityRole="alert">{t(message)}</Text> : null}
        <Button title={t("wEmail")} variant="secondary" size={16} onPress={() => router.push("/sign-in")} />
        <Button title={t("wTry")} variant="ghost" size={15} busy={busy} onPress={() => void run(signInAnonymously)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hero: { flex: 1, minHeight: 0, backgroundColor: color.surface },
  image: { width: "100%", height: "100%" },
  title: { marginBottom: 10 },
  actions: { gap: 8 },
});
