import * as Sentry from "@sentry/react-native";
import { setSink } from "./report";

/** Starts error reporting. A missing DSN is allowed only in development (see env.ts). */
export function initMonitoring(dsn: string | undefined) {
  if (!dsn) return;
  Sentry.init({ dsn, tracesSampleRate: 0.2 });
  setSink((error, context) => Sentry.captureException(error, { extra: context }));
}
