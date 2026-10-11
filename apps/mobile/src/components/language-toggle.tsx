import { isArabic, setLanguage, t, type Lang } from "@/i18n";
import { useFail } from "@/lib/use-fail";
import { Segmented } from "./segmented";

/** The English | العربية pill. Switching saves the choice and reloads the app into the new direction. */
export function LanguageToggle() {
  const fail = useFail();
  const options = [{ key: "en" as Lang, label: t("langEn"), arabic: false }, { key: "ar" as Lang, label: t("langAr"), arabic: true }];
  return <Segmented options={options} value={isArabic() ? "ar" : "en"} onChange={(lang) => void setLanguage(lang).catch(fail)} />;
}
