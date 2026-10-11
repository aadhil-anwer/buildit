import { t } from "@/i18n";
import { editedText } from "./edited";

const DAY = 86_400_000;
const now = new Date(2026, 9, 12, 15, 0).getTime(); // 12 Oct 2026, mid-afternoon
const ago = (days: number, hours = 0) => now - days * DAY - hours * 3_600_000;

test.each([
  [ago(0, 2), t("e0")],
  [ago(1), t("eYesterday")],
  [ago(2), t("eTwoDays")],
  [ago(3), t("eDays", 3)],
  [ago(6), t("eDays", 6)],
  [ago(7), t("e2")],
  [ago(13), t("e2")],
  [ago(14), t("eTwoWeeks")],
  [ago(21), t("eWeeks", 3)],
  [ago(27), t("eWeeks", 3)],
  [ago(40), t("eEarlier")],
])("%#: an edit this long ago reads %s", (when, expected) => expect(editedText(when, now)).toBe(expected));

test("counts calendar days: late last night is yesterday even if only a few hours ago", () =>
  expect(editedText(new Date(2026, 9, 11, 23, 30).getTime(), now)).toBe(t("eYesterday")));

test("a clock that is behind (an edit 'in the future') still reads as today", () => expect(editedText(now + 5 * 60_000, now)).toBe(t("e0")));
