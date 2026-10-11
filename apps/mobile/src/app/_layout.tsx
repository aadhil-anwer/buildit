import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/error-screen";
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
  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(report);
  }, [fontsReady]);
  return fontsReady ? <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} /> : null;
}
