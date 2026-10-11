import { typeInfo } from "./catalog";
import { ACCESS_CAP } from "./layout/clearance";
import type { IssueKind } from "./layout/validate";
import { layoutReport, tightestAccess, type LayoutReport } from "./summary";
import type { Scene, SceneObject } from "./types";

export type Status = "pass" | "tight" | "fail";
export type RuleId = "walkway" | "door" | "bed" | "storage" | "light";
export interface Rule {
  id: RuleId;
  status: Status;
  /** How much a failure costs the score. */
  weight: number;
  /** Measured and required width in cm, for width rules. */
  cm?: number;
  need?: number;
  objectIds: string[];
}

/** Under this nobody gets through (metres). Beds and storage need exactly this. */
const SECONDARY = 0.6;
const cm = (m: number) => Math.round(m * 100);

export const widthStatus = (width: number, need: number): Status =>
  cm(width) >= cm(need) ? "pass" : cm(width) >= cm(SECONDARY) ? "tight" : "fail";

/** 100 minus 1.4 per penalty point (a fail costs its weight, a tight half), minus 3 if the narrowest gap is under 1 m. */
export function scoreOf(rules: Rule[], narrowestCm: number) {
  const penalty = rules.reduce((sum, r) => sum + (r.status === "fail" ? r.weight : r.status === "tight" ? r.weight / 2 : 0), 0);
  return Math.max(0, Math.round(100 - 1.4 * penalty - (narrowestCm < 100 ? 3 : 0)));
}

export function roomCheck(scene: Scene, report: LayoutReport = layoutReport(scene, 0.05, { overlay: false })) {
  const { access } = report.clearance;
  const narrowest = tightestAccess(report.clearance);
  const tightestOf = (pick: (o: SceneObject) => boolean) => {
    const ids = new Set(scene.objects.filter(pick).map((o) => o.id));
    return access.filter((a) => ids.has(a.objectId)).sort((a, b) => a.width - b.width)[0] ?? null;
  };
  const widthRule = (id: RuleId, weight: number, at: { objectId: string; width: number } | null, need: number): Rule => ({
    id, weight, status: widthStatus(at?.width ?? ACCESS_CAP, need), cm: cm(at?.width ?? ACCESS_CAP), need: cm(need), objectIds: at ? [at.objectId] : [],
  });
  const blocked = (id: RuleId, weight: number, kind: IssueKind): Rule => {
    const ids = [...new Set(report.issues.filter((i) => i.kind === kind).flatMap((i) => i.objectIds))];
    return { id, weight, status: ids.length ? "fail" : "pass", objectIds: ids };
  };
  const isStorage = (o: SceneObject) => typeInfo(o.type).access === "fullFront";
  const opening = (type: string) => scene.room.openings.some((o) => o.type === type);

  const rules = [
    widthRule("walkway", 10, narrowest, scene.constraints.minWalkway),
    opening("door") && blocked("door", 8, "blocks_door"),
    scene.objects.some((o) => o.type === "bed") && widthRule("bed", 6, tightestOf((o) => o.type === "bed"), SECONDARY),
    scene.objects.some(isStorage) && widthRule("storage", 6, tightestOf(isStorage), SECONDARY),
    opening("window") && blocked("light", 5, "blocks_window"),
  ].filter((r): r is Rule => !!r);
  const found = narrowest && { cm: cm(narrowest.width), objectId: narrowest.objectId, between: narrowest.between };
  return { score: scoreOf(rules, found?.cm ?? Infinity), rules, narrowest: found, report };
}
