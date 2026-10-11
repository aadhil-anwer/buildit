import { typeInfo } from "../catalog";
import { COMPASS_DIR, add, dist, normDeg, scale } from "../geometry";
import { cloneScene, getObject } from "../scene";
import type { Pose, Scene } from "../types";
import { analyzeClearance } from "./clearance";
import { checkPose, findGeometryIssues } from "./validate";

export interface ImproveOptions {
  /** Walkway width to aim for (defaults to the scene's minimum). */
  targetWalkway?: number;
  /** Only these objects may move. */
  onlyIds?: string[];
  /** Wall-clock budget in ms. */
  budgetMs?: number;
}

export interface ImproveResult {
  scene: Scene;
  moved: { id: string; distance: number; rotated: boolean }[];
  before: LayoutScore;
  after: LayoutScore;
}

export interface LayoutScore {
  cost: number;
  hardProblems: number;
  tightestAccess: number | null;
  tightestObject: string | null;
}

function score(scene: Scene, original: Map<string, Pose>, target: number): LayoutScore {
  const geo = findGeometryIssues(scene);
  let cost = 0;
  let hard = 0;
  for (const i of geo) {
    if (i.severity === "error") {
      hard++;
      cost += 4 + (i.value ?? 0) * 10;
    } else {
      cost += 0.3;
    }
  }
  const cl = analyzeClearance(scene, { cell: 0.1, minWalkway: target });
  let tightest: number | null = null;
  let tightestObject: string | null = null;
  for (const a of cl.access) {
    if (a.width < 0.45) cost += 3;
    else cost += Math.max(0, target - a.width) * 6;
    if (tightest === null || a.width < tightest) {
      tightest = a.width;
      tightestObject = a.objectId;
    }
  }
  for (const o of scene.objects) {
    const p = original.get(o.id);
    if (p) cost += dist(p, o) * 0.15;
  }
  return { cost, hardProblems: hard, tightestAccess: tightest, tightestObject };
}

/** Objects worth moving: those named in problems, or all movable ones. */
function movableCandidates(scene: Scene, target: number, onlyIds?: string[]): string[] {
  const movable = (id: string) => {
    const o = getObject(scene, id);
    return !!o && !o.locked && !typeInfo(o.type).floorLevel && o.type !== "fixture";
  };
  if (onlyIds?.length) return onlyIds.filter(movable);
  const ids = new Set<string>();
  for (const i of findGeometryIssues(scene)) i.objectIds.forEach((id) => ids.add(id));
  const cl = analyzeClearance(scene, { cell: 0.1, minWalkway: target });
  for (const a of cl.access) {
    if (a.width >= target - 0.02) continue;
    ids.add(a.objectId);
    a.between?.forEach((id) => ids.add(id));
  }
  return [...ids].filter(movable);
}

/**
 * Hill-climb: repeatedly try small moves and quarter turns of the objects
 * involved in problems, keeping any move that lowers the layout cost.
 * Cost = hard problems + walkway shortfall + a small charge for moving
 * things away from where the user put them.
 */
export function improveLayout(input: Scene, opts: ImproveOptions = {}): ImproveResult {
  const target = opts.targetWalkway ?? input.constraints.minWalkway;
  const deadline = Date.now() + (opts.budgetMs ?? 2500);
  const original = new Map<string, Pose>(input.objects.map((o) => [o.id, { x: o.x, z: o.z, rotation: o.rotation }]));
  let scene = cloneScene(input);
  const before = score(scene, original, target);
  let current = before.cost;

  const steps = [0.1, 0.2, 0.35, 0.5];
  const dirs = [
    COMPASS_DIR.north,
    COMPASS_DIR.south,
    COMPASS_DIR.east,
    COMPASS_DIR.west,
    { x: 0.7071, z: 0.7071 },
    { x: 0.7071, z: -0.7071 },
    { x: -0.7071, z: 0.7071 },
    { x: -0.7071, z: -0.7071 },
  ];

  for (let round = 0; round < 12 && Date.now() < deadline; round++) {
    const ids = movableCandidates(scene, target, opts.onlyIds);
    let improved = false;
    for (const id of ids) {
      if (Date.now() > deadline) break;
      const obj = getObject(scene, id)!;
      const moves: Pose[] = [];
      for (const d of dirs) for (const s of steps) {
        const p = add(obj, scale(d, s));
        moves.push({ x: p.x, z: p.z, rotation: obj.rotation });
      }
      for (const r of [90, 180, 270]) moves.push({ x: obj.x, z: obj.z, rotation: normDeg(obj.rotation + r) });

      let bestPose: Pose | null = null;
      let bestCost = current - 0.01;
      for (const pose of moves) {
        if (Date.now() > deadline) break;
        // Only consider poses that are themselves clean.
        if (!checkPose(scene, obj, pose).ok) continue;
        const trial: Scene = { ...scene, objects: scene.objects.map((o) => (o.id === id ? { ...o, ...pose } : o)) };
        const c = score(trial, original, target).cost;
        if (c < bestCost) {
          bestCost = c;
          bestPose = pose;
        }
      }
      if (bestPose) {
        const p = bestPose;
        scene = {
          ...scene,
          objects: scene.objects.map((o) =>
            o.id === id ? { ...o, x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100, rotation: p.rotation } : o,
          ),
        };
        current = bestCost;
        improved = true;
      }
    }
    if (!improved) break;
  }

  const after = score(scene, original, target);
  const moved = scene.objects
    .map((o) => {
      const p = original.get(o.id)!;
      return { id: o.id, distance: Math.round(dist(p, o) * 100) / 100, rotated: Math.abs(normDeg(p.rotation) - normDeg(o.rotation)) > 0.5 };
    })
    .filter((m) => m.distance > 0.005 || m.rotated);
  return { scene, moved, before, after };
}
