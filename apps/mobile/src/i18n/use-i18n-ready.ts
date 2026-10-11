import { useEffect, useState } from "react";
import { initI18n } from ".";

/** False until the language is set up. A failure throws, so the error boundary shows it. */
export function useI18nReady() {
  const [state, setState] = useState<{ ready: boolean; error?: Error }>({ ready: false });
  useEffect(() => {
    initI18n().then(
      () => setState({ ready: true }),
      (error: Error) => setState({ ready: false, error }),
    );
  }, []);
  if (state.error) throw state.error;
  return state.ready;
}
