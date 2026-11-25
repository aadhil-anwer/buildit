/**
 * "Show me another layout": the room's own furniture, lifted and placed again the way a tradition prefers
 * (Vastu, feng shui, ma, Gulf custom) or plainly (practical). Same pieces, same ids and colours, so the app can
 * glide each one to its new spot. Every layout still has to pass the room check; a piece that can't be placed
 * again stays where it was. Scanned pieces and locked ones are never moved.
 */
import { getCatalogItem } from "./catalog";
import { COMPASS_DIR, dot } from "./geometry";
import { getWalls, roomCenter } from "./room";
import { objectFromCatalogId, withPose } from "./scene";
import type { Compass } from "./types";
import { failWeight, inferKind, kit, placeStep, stepIds, wallsByFit, type PlaceOps } from "./furnish";
import { resolvePlacement, type Placement } from "./layout/placement";
import { addObject, type OpResult } from "./ops";
import { TRADITIONS, traditionFit, traditionJudges, type TraditionCtx, type TraditionId } from "./traditions";
import type { FurnitureType, Room, Scene, SceneObject } from "./types";

export interface Arrangement {
  tradition: TraditionId;
  scene: Scene;
  /** Pieces that ended up somewhere else (or turned). */
  moved: string[];
}

/**
 * The five layouts of a room share most of their work: each starts from the same room with the same pieces lifted,
 * and most place them the same way. Adding a piece and scoring a room are pure, so they are remembered per room
 * (same walls, same pieces, same poses → same answer). A few hundred entries per room; dropped with the room.
 */
const MEMO = new WeakMap<Room, Map<string, unknown>>();
const poses = (s: Scene) => `${s.constraints.minWalkway}|` + s.objects.map((o) => `${o.id},${o.catalogId},${o.w},${o.d},${o.x},${o.z},${o.rotation}`).join(";");
function remember<T>(s: Scene, k: string, f: () => T): T {
  let m = MEMO.get(s.room);
  if (!m || m.size > 4000) MEMO.set(s.room, (m = new Map<string, unknown>()));
  const full = `${k}#${poses(s)}`;
  if (!m.has(full)) m.set(full, f());
  return m.get(full) as T;
}
const OPS: PlaceOps = {
  add: (s, catalogId, p) => remember(s, `add ${catalogId} ${p ? JSON.stringify(p) : "anywhere"}`, () => addObject(s, catalogId, p)),
  cost: (s) => remember(s, "cost", () => failWeight(s)),
};

/**
 * Where a piece would land for a spot, for ranking only: the solver's first valid pose, without its walkway
 * tie-break among near-equal candidates (up to ten walkway analyses per spot). Which wall, which end and which way
 * it faces are what the tradition rules read; the piece itself is then placed in full by placeStep.
 */
const roughPlace = (scene: Scene, catalogId: string, p: Placement): Scene | null =>
  remember(scene, `rough ${catalogId} ${JSON.stringify(p)}`, () => {
    const c = roomCenter(scene.room);
    const obj = objectFromCatalogId(scene, catalogId, { x: c.x, z: c.z, rotation: 0 });
    const res = resolvePlacement(scene, obj, p, { clearance: false });
    return res.ok ? { ...scene, objects: [...scene.objects, withPose(obj, res.pose)] } : null;
  });

const ENDS: Compass[] = ["north", "south", "east", "west"];
const key = (p: Placement) => JSON.stringify(p);

/**
 * The kit's spots for a piece against a wall, and then the ones it never offers: every wall (door walls too, if the
 * piece clears the swing) and each end of it, not only the middle. This is where a tradition finds a different room:
 * the wardrobe in the south-west corner, the bed's head to the east. Kit spots come first, so ties keep its plan.
 */
function widen(scene: Scene, options: Placement[]): Placement[] {
  const walls = getWalls(scene.room).filter((w) => w.length >= 1.2);
  const extra = options.flatMap((p) => {
    if (p.type !== "against_wall" || p.align_with) return [];
    return walls.flatMap((w) => [
      { ...p, wall: w.id, slide_toward: "center" as const },
      ...ENDS.filter((c) => Math.abs(dot(w.dir, COMPASS_DIR[c])) > 0.7).map((c) => ({ ...p, wall: w.id, slide_toward: c })),
    ]);
  });
  const seen = new Set<string>();
  return [...options, ...extra].filter((p) => !seen.has(key(p)) && !!seen.add(key(p)));
}

/** A step's spots, best for the tradition first: each tried for this piece alone (stable, so ties keep the kit's order). */
function* rank(scene: Scene, catalogId: string, kitOptions: Placement[], tradition: TraditionId, ctx: TraditionCtx): Generator<null, Placement[]> {
  const type = getCatalogItem(catalogId)?.type;
  if (tradition === "practical" || !type || !traditionJudges(tradition, type)) return kitOptions; // no rule about it: the practical spot
  const options = widen(scene, kitOptions);
  if (options.length < 2) return options;
  const scored: { p: Placement; i: number; fit: number }[] = [];
  for (const [i, p] of options.entries()) {
    yield null;
    const trial = roughPlace(scene, catalogId, p);
    scored.push({ p, i, fit: trial ? traditionFit(trial, tradition, ctx, [type]) : -99 });
  }
  return scored.sort((a, b) => b.fit - a.fit || a.i - b.i).map((x) => x.p);
}

/** The new piece takes the lifted piece's identity: same id, colour, name and lock, so it reads as the same sofa moved. */
const asOriginal = (res: OpResult, piece: SceneObject): Scene => ({
  ...res.scene,
  objects: res.scene.objects.map((o) => (o.id === res.changed[0] ? { ...o, id: piece.id, color: piece.color, name: piece.name } : o)),
});

/** Which of the room's pieces the kit knows how to place, matched to its steps in order (scanned and locked pieces stay). */
function liftable(scene: Scene, steps: ReturnType<typeof kit>) {
  const pool = new Map<FurnitureType, SceneObject[]>();
  for (const o of scene.objects) if (!o.locked && getCatalogItem(o.catalogId)) pool.set(o.type, [...(pool.get(o.type) ?? []), o]);
  return steps.flatMap((step) => {
    const piece = pool.get(getCatalogItem(stepIds(step)[0])!.type)?.shift();
    return piece ? [{ step, piece }] : [];
  });
}

export function* arrangeSteps(scene: Scene, tradition: TraditionId, ctx: TraditionCtx = {}): Generator<null, Arrangement | null> {
  const kind = inferKind(scene);
  if (!kind) return null;
  const lifts = liftable(scene, kit(kind, scene));
  const lifted = new Set(lifts.map((l) => l.piece.id));
  let working: Scene = { ...scene, objects: scene.objects.filter((o) => !lifted.has(o.id)) };
  const placed: Record<string, string> = {};
  for (const o of working.objects) placed[o.type] ??= o.id;
  const walls = wallsByFit(working);
  for (const { step, piece } of lifts) {
    const options = yield* rank(working, piece.catalogId, step.place(placed, walls, working), tradition, ctx);
    const res = yield* placeStep(working, [piece.catalogId], options, true, OPS);
    working = res ? asOriginal(res, piece) : { ...working, objects: [...working.objects, piece] }; // nowhere better: it stays put
    placed[piece.type] ??= piece.id;
  }
  const was = new Map(scene.objects.map((o) => [o.id, o]));
  const moved = working.objects.filter((o) => { const b = was.get(o.id); return !b || b.x !== o.x || b.z !== o.z || b.rotation !== o.rotation; }).map((o) => o.id);
  return { tradition, scene: working, moved };
}

/** Two arrangements of the same pieces match when every piece sits within a centimetre and the same turn of the other. */
export function samePoses(a: Scene, b: Scene): boolean {
  const pose = new Map(b.objects.map((o) => [o.id, o]));
  return a.objects.length === b.objects.length && a.objects.every((o) => {
    const p = pose.get(o.id);
    return !!p && Math.abs(p.x - o.x) < 0.01 && Math.abs(p.z - o.z) < 0.01 && Math.abs(p.rotation - o.rotation) < 0.01;
  });
}

/** Every tradition's layout for this room, in the order the cards show them. Yields between attempts. */
export function* arrangeAllSteps(scene: Scene, ctx: TraditionCtx = {}): Generator<TraditionId | null, Arrangement[]> {
  const out: Arrangement[] = [];
  for (const tradition of TRADITIONS) {
    yield tradition;
    const a = yield* arrangeSteps(scene, tradition, ctx);
    if (a) out.push(a);
  }
  return out;
}

/** Runs one at once (tests, server). */
export function arrange(scene: Scene, tradition: TraditionId, ctx: TraditionCtx = {}): Arrangement | null {
  const run = arrangeSteps(scene, tradition, ctx);
  let step = run.next();
  while (!step.done) step = run.next();
  return step.value;
}
