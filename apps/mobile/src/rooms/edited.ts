import { t } from "@/i18n";

const DAY = 86_400_000;
const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);

/** "Edited today", "Edited 3 days ago", "Edited last week"... counted in calendar days. */
export function editedText(updatedAt: number, now: number): string {
  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(updatedAt)) / DAY));
  if (days === 0) return t("e0");
  if (days === 1) return t("eYesterday");
  if (days === 2) return t("eTwoDays");
  if (days < 7) return t("eDays", days);
  if (days < 14) return t("e2");
  const weeks = Math.floor(days / 7);
  if (weeks === 2) return t("eTwoWeeks");
  return weeks < 5 ? t("eWeeks", weeks) : t("eEarlier");
}
