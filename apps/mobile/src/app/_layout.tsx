import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SessionProvider, useSession } from "@/auth/session";
import { ErrorScreen } from "@/components/error-screen";
import { isArabic } from "@/i18n";
import { useI18nReady } from "@/i18n/use-i18n-ready";
import { env } from "@/lib/env";
import { initMonitoring } from "@/lib/monitoring";
import { report } from "@/lib/report";
import { color } from "@/theme";
import { useSync } from "@/sync/use-sync";
import { useAppFonts } from "@/theme/fonts";

initMonitoring(env.SENTRY_DSN);
SplashScreen.preventAutoHideAsync().catch(report);

export const ErrorBoundary = ({ error, retry }: ErrorBoundaryProps) => <ErrorScreen error={error} retry={retry} />;

/** Waits for fonts, language and login, then shows the screens this person may see. */
function Routes() {
  const session = useSession();
  const fontsReady = useAppFonts();
  const i18nReady = useI18nReady();
  useSync();
  const ready = fontsReady && i18nReady && session !== undefined;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(report);
  }, [ready]);
  if (!ready) return null;
  return (
    <View style={{ flex: 1, direction: isArabic() ? "rtl" : "ltr" }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="rooms" />
          <Stack.Screen name="editor/[id]" />
          <Stack.Screen name="versions/[id]" />
          <Stack.Screen name="capture/index" />
          <Stack.Screen name="capture/dimensions" />
          <Stack.Screen name="review/[id]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="upgrade" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <Routes />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
