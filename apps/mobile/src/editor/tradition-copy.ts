import type { Compass, TraditionId, TraditionRuleResult } from "@buildit/core";
import { formatNumber, t, type StringKey } from "@/i18n";

const NAME: Record<TraditionId, [StringKey, StringKey]> = {
  practical: ["tPractical", "tPracticalP"],
  vastu: ["tVastu", "tVastuP"],
  fengshui: ["tFengshui", "tFengshuiP"],
  ma: ["tMa", "tMaP"],
  arabian: ["tArabian", "tArabianP"],
};
// Rules whose sentence has no measured fact in it.
type PlainKey = "vStorageSW" | "vOpenCentre" | "fSolidWall" | "mEdges" | "aSeatsOnWalls" | "aPrivacy" | "aQibla";
const PLAIN: Record<string, PlainKey | undefined> = { vStorageSW: "vStorageSW", vOpenCentre: "vOpenCentre", fSolidWall: "fSolidWall", mEdges: "mEdges", aSeatsOnWalls: "aSeatsOnWalls", aPrivacy: "aPrivacy", aQibla: "aQibla" };
const DIR: Record<Compass, StringKey> = { north: "dNorth", south: "dSouth", east: "dEast", west: "dWest" };

/** "Vastu", and the one-line idea behind it. */
export const traditionName = (id: TraditionId) => t(NAME[id][0]);
export const traditionIdea = (id: TraditionId) => t(NAME[id][1]);

/** One fact for the sentence: a compass point in words, or a number in the reader's digits. */
const fact = (v: string | number | undefined) => (typeof v === "number" ? formatNumber(v) : v && v in DIR ? t(DIR[v as Compass]) : "–");

/** A rule as a sentence with what was measured: "Head to the south or east (now west)". */
export function ruleLine(r: TraditionRuleResult): string {
  switch (r.id) {
    case "vBedHead": return t("vBedHead", fact(r.facts.head));
    case "vFaceNE": return t("vFaceNE", fact(r.facts.faces));
    case "fCommand": return t("fCommand", fact(r.facts.angle));
    case "mOpenFloor": return t("mOpenFloor", fact(r.facts.pct));
    case "aHostFacesDoor": return t("aHostFacesDoor", fact(r.facts.angle));
    default: {
      const key = PLAIN[r.id];
      return key ? t(key) : r.id;
    }
  }
}
