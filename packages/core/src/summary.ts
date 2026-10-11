import { typeInfo } from "./catalog";
import { dot, facingLabel, frontDir, obbCorners, pointSegmentDistance, round2 } from "./geometry";
import { ACCESS_CAP, analyzeClearance, type ClearanceReport } from "./layout/clearance";
import { findGeometryIssues, type Issue } from "./layout/validate";
import { getWalls, roomArea } from "./room";
import { costSummary, objectObb, totalSeats } from "./scene";
import type { Scene, SceneObject } from "./types";

/** "against the west wall", "0.8 m from the north wall" etc. */
export function wallRelation(scene: Scene, o: SceneObject): { wall: string; gap: number; backToWall: boolean } | null {
  const walls = getWalls(scene.room);
  const corners = obbCorners(objectObb(o));
  let best: { wall: string; gap: number; backToWall: boolean } | null = null;
  for (const w of walls) {
    const gap = Math.min(...corners.map((c) => pointSegmentDistance(c, w.start, w.end)));
    if (!best || gap < best.gap) {
      best = { wall: w.id, gap: round2(gap), backToWall: dot(frontDir(o.rotation), w.inward) > 0.9 };
    }
  }
  return best;
}

export function describePosition(scene: Scene, o: SceneObject): string {
  const rel = wallRelation(scene, o);
  const facing = `facing ${facingLabel(o.rotation)}`;
  if (!rel) return facing;
  if (rel.gap <= 0.08) return `${rel.backToWall ? "back against" : "touching"} the ${rel.wall} wall, ${facing}`;
  return `${rel.gap.toFixed(2)} m from the ${rel.wall} wall, ${facing}`;
}

export interface LayoutReport {
  issues: Issue[];
  clearance: ClearanceReport;
}

export function layoutReport(scene: Scene, cell = 0.05, { overlay = true } = {}): LayoutReport {
  const clearance = analyzeClearance(scene, { cell, overlay });
  return { issues: [...findGeometryIssues(scene), ...clearance.issues], clearance };
}

/** Compact JSON description of the scene for the language model. */
export function summarizeScene(scene: Scene, report: LayoutReport = layoutReport(scene, 0.1)) {
  const walls = getWalls(scene.room);
  const cost = costSummary(scene);
  const access = Object.fromEntries(report.clearance.access.map((a) => [a.objectId, a]));
  return {
    room: {
      name: scene.room.name,
      height_m: scene.room.height,
      floor_area_m2: round2(roomArea(scene.room)),
      corners: scene.room.corners.map((c) => [round2(c.x), round2(c.z)]),
      walls: walls.map((w) => ({ id: w.id, length_m: round2(w.length) })),
      openings: scene.room.openings.map((op) => ({
        id: op.id,
        type: op.type,
        wall: walls[op.wall]?.id,
        width_m: op.width,
        from_wall_start_m: round2(op.offset),
        ...(op.type === "window" ? { sill_m: op.sill } : {}),
      })),
      floor_color: scene.room.floorColor,
      wall_color: scene.room.wallColor,
    },
    objects: scene.objects.map((o) => {
      const a = access[o.id];
      return {
        id: o.id,
        name: o.name,
        type: o.type,
        size_m: [round2(o.w), round2(o.d), round2(o.h)],
        center: [round2(o.x), round2(o.z)],
        rotation: Math.round(o.rotation),
        where: describePosition(scene, o),
        color: o.color,
        ...(o.seats ? { seats: o.seats } : {}),
        ...(o.locked ? { locked: true } : {}),
        ...(typeof o.price === "number" ? { price: `${o.price} ${o.currency ?? ""}`.trim() } : {}),
        ...(a && a.width < ACCESS_CAP ? { access_width_cm: Math.round(a.width * 100) } : {}),
        ...(typeInfo(o.type).floorLevel ? { floor_level: true } : {}),
      };
    }),
    stats: {
      seats: totalSeats(scene),
      free_floor_pct: Math.round(report.clearance.freeFloorRatio * 100),
      comfortably_walkable_pct: Math.round(report.clearance.walkableRatio * 100),
      ...(cost.pricedCount ? { priced_total: `${cost.total} ${cost.currency ?? ""}`.trim(), unpriced_items: cost.unpricedCount } : {}),
    },
    min_walkway_m: scene.constraints.minWalkway,
    issues: report.issues.map((i) => `${i.severity === "error" ? "ERROR" : "warning"}: ${i.message}`),
  };
}

export function issueCounts(issues: Issue[]) {
  return {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
  };
}

/** Narrowest access across all objects, for headline metrics. */
export function tightestAccess(report: ClearanceReport) {
  let best: ClearanceReport["access"][number] | null = null;
  for (const a of report.access) if (!best || a.width < best.width) best = a;
  return best;
}
