import type { Rule } from "@buildit/core";
import { t } from "@/i18n";
import { ruleText, topIssue } from "./check-copy";

const rule = (id: Rule["id"], status: Rule["status"], cm?: number): Rule => ({ id, status, weight: 1, cm, objectIds: [] });

test.each([
  [rule("walkway", "tight", 72), t("sWalk", 72)],
  [rule("bed", "fail", 40), t("sBed", 40)],
  [rule("storage", "tight", 55), t("sStor", 55)],
  [rule("door", "fail"), t("sDoor")],
  [rule("light", "fail"), t("sLight")],
])("%j reads as its sentence", (r, text) => expect(ruleText(r)).toBe(text));

test("the top issue is the first rule that is not passing", () => {
  const rules = [rule("walkway", "pass", 90), rule("bed", "tight", 55), rule("door", "fail")];
  expect(topIssue(rules)?.id).toBe("bed");
  expect(topIssue([rule("walkway", "pass", 90)])).toBeUndefined();
});
