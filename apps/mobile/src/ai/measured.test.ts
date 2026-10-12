import type { Facts } from "@buildit/core";
import { t } from "@/i18n";
import { measuredRows } from "./measured";

const facts = (over: Partial<Facts> = {}): Facts => ({ score: 75, walkwayCm: 55, errors: 0, warnings: 2, seats: 1, tipsMet: 1, tipsTotal: 2, ...over });

test("only what changed is listed, before and after, worded for the card", () => {
  const rows = measuredRows(facts(), facts({ score: 91, walkwayCm: 92, warnings: 0 }));
  expect(rows.map((r) => r.key)).toEqual(["score", "walkwayCm", "warnings"]);
  expect(rows[0]).toEqual({ key: "score", label: t("facScore"), before: "75", after: "91" });
  expect(rows[1]).toMatchObject({ before: t("facCm", 55), after: t("facCm", 92) });
});

test("nothing changed means no rows", () => expect(measuredRows(facts(), facts())).toEqual([]));

test("a walkway that is no longer tight says so instead of a number", () => {
  expect(measuredRows(facts(), facts({ walkwayCm: null }))[0].after).toBe(t("facWalkOpen"));
});

test("design tips show as 'x of y'", () => {
  expect(measuredRows(facts(), facts({ tipsMet: 2 }))[0]).toMatchObject({ before: t("facTipsOf", 1, 2), after: t("facTipsOf", 2, 2) });
});
