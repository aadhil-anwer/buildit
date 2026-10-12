import type { DesignTip, TipId } from "@buildit/core";
import { formatFixed, t } from "@/i18n";

const cm = (m: number) => Math.round(m * 100);
const metres = (m: number) => formatFixed(m, 1);

/** For each rule: the sentence when it is met and when it is not, given the measured value and the comfortable range. */
const WORDS: Record<TipId, (v: number, lo: number, hi: number) => [ok: string, no: string]> = {
  coffee_table_gap: (v) => [t("tipCoffeeOk", cm(v)), t("tipCoffeeNo", cm(v))],
  tv_distance: (v, lo, hi) => [t("tipTvOk", metres(v)), t("tipTvNo", metres(v), metres(lo), metres(hi))],
  conversation_distance: (v, _lo, hi) => [t("tipTalkOk", metres(v)), t("tipTalkNo", metres(v), metres(hi))],
  rug_under_seating: () => [t("tipRugOk"), t("tipRugNo")],
};

/** One design tip in a sentence, with the engine's own measured numbers. */
export function tipText(tip: DesignTip): string {
  const [ok, no] = WORDS[tip.id](tip.value ?? 0, tip.ideal?.[0] ?? 0, tip.ideal?.[1] ?? 0);
  return tip.ok ? ok : no;
}
