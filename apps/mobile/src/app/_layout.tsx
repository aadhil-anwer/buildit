import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { ErrorScreen } from "@/components/error-screen";
import { isArabic } from "@/i18n";
import { useI18nReady } from "@/i18n/use-i18n-ready";
import { env } from "@/lib/env";
import { initMonitoring } from "@/lib/monitoring";
import { report } from "@/lib/report";
import { color } from "@/theme";
import { useAppFonts } from "@/theme/fonts";

initMonitoring(env.SENTRY_DSN);
SplashScreen.preventAutoHideAsync().catch(report);

export const ErrorBoundary = ({ error, retry }: ErrorBoundaryProps) => <ErrorScreen error={error} retry={retry} />;

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const i18nReady = useI18nReady();
  const ready = fontsReady && i18nReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(report);
  }, [ready]);
  if (!ready) return null;
  return (
    <View style={{ flex: 1, direction: isArabic() ? "rtl" : "ltr" }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
    </View>
  );
}
