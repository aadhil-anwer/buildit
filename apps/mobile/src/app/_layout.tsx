import { Stack, type ErrorBoundaryProps } from "expo-router";
import { ErrorScreen } from "@/components/error-screen";
import { env } from "@/lib/env";
import { initMonitoring } from "@/lib/monitoring";

initMonitoring(env.SENTRY_DSN);

export const ErrorBoundary = ({ error, retry }: ErrorBoundaryProps) => <ErrorScreen error={error} retry={retry} />;

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
