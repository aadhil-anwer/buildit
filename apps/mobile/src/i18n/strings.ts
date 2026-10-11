import { generated } from "./strings.generated";

// Strings the design doc does not have (it only covers the designed screens).
// The Arabic here has not had a native-speaker review (see OPEN_ISSUES.md).
const extra = {
  en: { errTitle: "Something went wrong", errBody: "If it keeps happening, close and reopen the app." },
  ar: { errTitle: "حدث خطأ ما", errBody: "إذا استمرت المشكلة، فأغلق التطبيق وأعد فتحه." },
} as const;

export const strings = {
  en: { ...generated.en, ...extra.en },
  ar: { ...generated.ar, ...extra.ar },
} as const;
