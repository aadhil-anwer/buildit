import { useEffect, useState } from "react";
import { useFail } from "@/lib/use-fail";
import { initI18n } from ".";

/** False until the language is set up. A failure reaches the error boundary. */
export function useI18nReady() {
  const [ready, setReady] = useState(false);
  const fail = useFail();
  useEffect(() => {
    initI18n().then(() => setReady(true), fail);
  }, [fail]);
  return ready;
}
