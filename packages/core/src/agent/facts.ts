import { roomCheck } from "../check";
import { designTips } from "../rules/design-tips";
import { layoutReport } from "../summary";
import { totalSeats } from "../scene";
import type { Scene } from "../types";

/** What the engine measures about a room, before and after the AI changes it. The model never supplies any of these. */
export interface Facts {
  /** The room check score, 0-100. */
  score: number;
  /** The narrowest walking width to anything reachable, in centimetres; null when nothing limits it. */
  walkwayCm: number | null;
  errors: number;
  warnings: number;
  seats: number;
  tipsMet: number;
  tipsTotal: number;
}

export function measure(scene: Scene): Facts {
  const report = layoutReport(scene, 0.1);
  const check = roomCheck(scene, report);
  const tips = designTips(scene);
  return {
    score: check.score,
    walkwayCm: check.narrowest ? check.narrowest.cm : null,
    errors: report.issues.filter((i) => i.severity === "error").length,
    warnings: report.issues.filter((i) => i.severity === "warning").length,
    seats: totalSeats(scene),
    tipsMet: tips.filter((t) => t.ok).length,
    tipsTotal: tips.length,
  };
}

export interface FactChange {
  key: keyof Facts;
  before: number | null;
  after: number | null;
}

/** Only the facts that differ, for the "Measured" card. */
export const factChanges = (before: Facts, after: Facts): FactChange[] =>
  (Object.keys(before) as (keyof Facts)[]).filter((k) => before[k] !== after[k]).map((key) => ({ key, before: before[key], after: after[key] }));

/**
 * Whether every number in a model's reply is one the engine measured (in either state, in cm or m) or the person typed.
 * A reply that quotes any other number is not shown: the card shows the engine's own facts instead.
 */
export function numbersAreMeasured(text: string, facts: Facts[], typed: string): boolean {
  const allowed = new Set<number>();
  for (const f of facts) {
    for (const v of Object.values(f) as (number | null)[]) if (v !== null) allowed.add(v);
    if (f.walkwayCm !== null) [f.walkwayCm / 100, Math.round(f.walkwayCm / 10) / 10].forEach((m) => allowed.add(m));
  }
  const near = (n: number) => [...allowed].some((a) => Math.abs(a - n) < 0.011);
  const mentions = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((m) => Number(m.replace(",", ".")));
  const typedNumbers = mentions(typed);
  return mentions(text).every((n) => near(n) || typedNumbers.includes(n));
}
