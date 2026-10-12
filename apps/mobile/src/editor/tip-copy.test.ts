import type { DesignTip } from "@buildit/core";
import { t } from "@/i18n";
import { tipText } from "./tip-copy";

const tip = (over: Partial<DesignTip> & Pick<DesignTip, "id" | "ok">): DesignTip => ({ objectIds: [], ...over });

test("each tip reads as a sentence with the measured numbers", () => {
  expect(tipText(tip({ id: "coffee_table_gap", ok: true, value: 0.4 }))).toBe(t("tipCoffeeOk", 40));
  expect(tipText(tip({ id: "coffee_table_gap", ok: false, value: 0.1 }))).toBe(t("tipCoffeeNo", 10));
  expect(tipText(tip({ id: "tv_distance", ok: false, value: 1.2, ideal: [2.1, 3.5] }))).toBe(t("tipTvNo", "1.2", "2.1", "3.5"));
  expect(tipText(tip({ id: "conversation_distance", ok: false, value: 3.4, ideal: [0, 3] }))).toBe(t("tipTalkNo", "3.4", "3.0"));
  expect(tipText(tip({ id: "rug_under_seating", ok: true }))).toBe(t("tipRugOk"));
  expect(tipText(tip({ id: "rug_under_seating", ok: false }))).toBe(t("tipRugNo"));
});
