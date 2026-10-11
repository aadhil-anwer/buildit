import { useCallback, useState } from "react";

/** Returns a function that, when called with an error, makes the next render throw it, so the error boundary reports and shows it. */
export function useFail() {
  const [error, setError] = useState<Error>();
  if (error) throw error;
  return useCallback((e: unknown) => setError(e instanceof Error ? e : new Error(String(e))), []);
}
