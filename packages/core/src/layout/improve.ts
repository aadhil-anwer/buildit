import { typeInfo } from "../catalog";
import { COMPASS_DIR, add, dist, normDeg, round2, scale } from "../geometry";
import { designTips } from "../rules/design-tips";
import { cloneScene, getObject } from "../scene";
import type { Pose, Scene, SceneObject } from "../types";
import { analyzeClearance } from "./clearance";
import { checkPose, findGeometryIssues } from "./validate";

export interface ImproveOptions {
  /** Walkway width to aim for (defaults to the scene's minimum). */
  targetWalkway?: number;
  /** Only these objects may move. */
  onlyIds?: string[];
  /** These objects must stay put (to offer "another option"). */
  excludeIds?: string[];
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
  const cl = analyzeClearance(scene, { cell: 0.1, minWalkway: target, overlay: false });
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
  // Design rules of thumb nudge the search, far less than a blocked door or a tight walkway.
  cost += designTips(scene).filter((t) => !t.ok).length * 0.4;
  for (const o of scene.objects) {
    const p = original.get(o.id);
    if (p) cost += dist(p, o) * 0.15;
  }
  return { cost, hardProblems: hard, tightestAccess: tightest, tightestObject };
}

/** Objects worth moving: those named in problems, or all movable ones. */
function movableCandidates(scene: Scene, target: number, opts: ImproveOptions): string[] {
  const movable = (id: string) => {
    const o = getObject(scene, id);
    return !!o && !o.locked && !typeInfo(o.type).floorLevel && o.type !== "fixture" && !opts.excludeIds?.includes(id);
  };
  if (opts.onlyIds?.length) return opts.onlyIds.filter(movable);
  const ids = new Set<string>();
  for (const i of findGeometryIssues(scene)) i.objectIds.forEach((id) => ids.add(id));
  const cl = analyzeClearance(scene, { cell: 0.1, minWalkway: target, overlay: false });
  for (const a of cl.access) {
    if (a.width >= target - 0.02) continue;
    ids.add(a.objectId);
    a.between?.forEach((id) => ids.add(id));
  }
  return [...ids].filter(movable);
}

const STEPS = [0.1, 0.2, 0.35, 0.5];
const DIRS = [COMPASS_DIR.north, COMPASS_DIR.south, COMPASS_DIR.east, COMPASS_DIR.west, { x: 0.7071, z: 0.7071 }, { x: 0.7071, z: -0.7071 }, { x: -0.7071, z: 0.7071 }, { x: -0.7071, z: -0.7071 }];

/** Every small move (8 directions x 4 distances) and quarter turn worth trying for one object. */
const candidatePoses = (o: SceneObject): Pose[] => [
  ...DIRS.flatMap((d) => STEPS.map((s) => ({ ...add(o, scale(d, s)), rotation: o.rotation }))),
  ...[90, 180, 270].map((r) => ({ x: o.x, z: o.z, rotation: normDeg(o.rotation + r) })),
];

const place = (scene: Scene, id: string, p: Pose): Scene => ({ ...scene, objects: scene.objects.map((o) => (o.id === id ? { ...o, ...p } : o)) });
const rounded = (p: Pose): Pose => ({ x: round2(p.x), z: round2(p.z), rotation: p.rotation });

function movedPieces(scene: Scene, original: Map<string, Pose>) {
  const moves = scene.objects.map((o) => {
    const p = original.get(o.id);
    return p && { id: o.id, distance: round2(dist(p, o)), rotated: Math.abs(normDeg(p.rotation) - normDeg(o.rotation)) > 0.5 };
  });
  return moves.filter((m): m is NonNullable<typeof m> => !!m && (m.distance > 0.005 || m.rotated));
}

interface Search {
  original: Map<string, Pose>;
  target: number;
  deadline: number;
}

/** The best clean small move or turn for one object that beats `current`, if any. */
function* bestMove(scene: Scene, id: string, current: number, { original, target, deadline }: Search): Generator<void, { pose: Pose; cost: number } | null> {
  const obj = getObject(scene, id);
  let best: { pose: Pose; cost: number } | null = null;
  for (const pose of obj ? candidatePoses(obj) : []) {
    yield;
    if (Date.now() > deadline) break;
    if (!obj || !checkPose(scene, obj, pose).ok) continue; // only poses that are themselves clean
    const cost = score(place(scene, id, pose), original, target).cost;
    if (cost < (best?.cost ?? current - 0.01)) best = { pose, cost };
  }
  return best;
}

/**
 * Hill-climb: repeatedly try small moves and quarter turns of the objects
 * involved in problems, keeping any move that lowers the layout cost.
 * Cost = hard problems + walkway shortfall + a small charge for moving
 * things away from where the user put them. Written as steps (one `yield`
 * per candidate pose) so a caller can pause between them; returns the result.
 */
export function* improveSteps(input: Scene, opts: ImproveOptions = {}): Generator<void, ImproveResult> {
  const search: Search = {
    target: opts.targetWalkway ?? input.constraints.minWalkway,
    deadline: Date.now() + (opts.budgetMs ?? 2500),
    original: new Map(input.objects.map((o) => [o.id, { x: o.x, z: o.z, rotation: o.rotation }])),
  };
  let scene = cloneScene(input);
  const before = score(scene, search.original, search.target);
  let current = before.cost;

  for (let round = 0; round < 12 && Date.now() < search.deadline; round++) {
    let improved = false;
    for (const id of movableCandidates(scene, search.target, opts)) {
      const best = yield* bestMove(scene, id, current, search);
      if (!best) continue;
      scene = place(scene, id, rounded(best.pose));
      current = best.cost;
      improved = true;
    }
    if (!improved) break;
  }
  return { scene, moved: movedPieces(scene, search.original), before, after: score(scene, search.original, search.target) };
}

/** Runs the whole search at once. */
export function improveLayout(input: Scene, opts: ImproveOptions = {}): ImproveResult {
  const run = improveSteps(input, opts);
  let step = run.next();
  while (!step.done) step = run.next();
  return step.value;
}

/**
 * Runs the search but calls `pause` every `sliceMs`, so the UI thread is never blocked for long.
 * The caller supplies a pause that really yields to rendering (a timer, not a microtask).
 */
export async function improveLayoutSliced(
  input: Scene,
  opts: ImproveOptions,
  { sliceMs = 8, pause }: { sliceMs?: number; pause: () => Promise<void> },
): Promise<ImproveResult> {
  const run = improveSteps(input, opts);
  let sliceStart = Date.now();
  for (let step = run.next(); ; step = run.next()) {
    if (step.done) return step.value;
    if (Date.now() - sliceStart >= sliceMs) {
      await pause();
      sliceStart = Date.now();
    }
  }
}
