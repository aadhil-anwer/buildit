import type { Facts } from "@buildit/core";
import { formatNumber, t } from "@/i18n";

export interface MeasuredRow {
  key: keyof Facts;
  label: string;
  before: string;
  after: string;
}

const ROWS: { key: keyof Facts; label: Parameters<typeof t>[0]; show: (v: Facts) => string }[] = [
  { key: "score", label: "facScore", show: (f) => formatNumber(f.score) },
  { key: "walkwayCm", label: "facWalk", show: (f) => (f.walkwayCm === null ? t("facWalkOpen") : t("facCm", f.walkwayCm)) },
  { key: "errors", label: "facErrors", show: (f) => formatNumber(f.errors) },
  { key: "warnings", label: "facWarnings", show: (f) => formatNumber(f.warnings) },
  { key: "seats", label: "facSeats", show: (f) => formatNumber(f.seats) },
  { key: "tipsMet", label: "facTips", show: (f) => t("facTipsOf", f.tipsMet, f.tipsTotal) },
];

/** The engine's own before and after, for the facts that changed, worded for the card. The designer's reply plays no part. */
export function measuredRows(before: Facts, after: Facts): MeasuredRow[] {
  return ROWS.filter((r) => before[r.key] !== after[r.key] || (r.key === "tipsMet" && before.tipsTotal !== after.tipsTotal)).map((r) => ({ key: r.key, label: t(r.label), before: r.show(before), after: r.show(after) }));
}
