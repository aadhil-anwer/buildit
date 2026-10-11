import { useCallback, useState } from "react";
import type { StringKey } from "@/i18n";
import { useFail } from "@/lib/use-fail";
import { authErrorKey } from "./auth";

/** Runs a sign-in step. Failures a person can fix become a message; any other failure reaches the error boundary. */
export function useAuthAction() {
  const [message, setMessage] = useState<StringKey>();
  const [busy, setBusy] = useState(false);
  const fail = useFail();
  const run = useCallback(
    async (action: () => Promise<void>) => {
      setMessage(undefined);
      setBusy(true);
      try {
        await action();
      } catch (error) {
        const key = authErrorKey(error);
        if (key) setMessage(key);
        else fail(error);
      } finally {
        setBusy(false);
      }
    },
    [fail],
  );
  return { run, message, busy };
}
