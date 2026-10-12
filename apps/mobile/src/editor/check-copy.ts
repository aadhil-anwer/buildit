import type { Rule } from "@buildit/core";
import { t } from "@/i18n";

/** One rule's finding in words, with its measured width where it has one. */
export function ruleText(rule: Rule): string {
  switch (rule.id) {
    case "walkway": return t("sWalk", rule.cm ?? 0);
    case "bed": return t("sBed", rule.cm ?? 0);
    case "storage": return t("sStor", rule.cm ?? 0);
    case "door": return t("sDoor");
    case "light": return t("sLight");
  }
}

/** The first rule that is not passing: what the chip leads with. */
export const topIssue = (rules: Rule[]) => rules.find((r) => r.status !== "pass");
