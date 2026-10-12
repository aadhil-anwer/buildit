import { formatNumber, t } from "@/i18n";

const MINUTE = 60_000;
const DAY = 86_400_000;
const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);
const two = (n: number) => formatNumber(Math.floor(n / 10)) + formatNumber(n % 10);

/** "Just now", "Today, 9:12", "Yesterday, 18:40", "3 days ago, 7:05": when a version was saved, in the language's digits. */
export function versionTime(savedAt: number, now: number): string {
  if (now - savedAt < MINUTE) return t("justNow");
  const when = new Date(savedAt);
  const clock = `${formatNumber(when.getHours())}:${two(when.getMinutes())}`;
  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(savedAt)) / DAY));
  if (days === 0) return t("verToday", clock);
  return days === 1 ? t("verYesterday", clock) : t("verDaysAgo", days, clock);
}
