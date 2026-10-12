import { t } from "@/i18n";
import { versionTime } from "./version-time";

const at = (day: number, h: number, m: number) => new Date(2026, 9, day, h, m).getTime();
const now = at(12, 15, 30);

test("under a minute reads as just now", () => expect(versionTime(now - 30_000, now)).toBe(t("justNow")));
test("earlier today gives the clock time", () => expect(versionTime(at(12, 9, 12), now)).toBe(t("verToday", "9:12")));
test("minutes are always two digits", () => expect(versionTime(at(12, 9, 5), now)).toBe(t("verToday", "9:05")));
test("yesterday says so", () => expect(versionTime(at(11, 18, 40), now)).toBe(t("verYesterday", "18:40")));
test("older ones count the days", () => expect(versionTime(at(8, 7, 5), now)).toBe(t("verDaysAgo", 4, "7:05")));
