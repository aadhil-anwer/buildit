/**
 * "Show me another layout": the room's own furniture, lifted and placed again the way a tradition prefers
 * (Vastu, feng shui, ma, Gulf custom) or plainly (practical). Same pieces, same ids and colours, so the app can
 * glide each one to its new spot. Every layout still has to pass the room check; a piece that can't be placed
 * again stays where it was. Scanned pieces and locked ones are never moved.
 */
import { getCatalogItem } from "./catalog";
import { inferKind, kit, placeStep, stepIds, wallsByFit } from "./furnish";
import type { Placement } from "./layout/placement";
import { addObject, type OpResult } from "./ops";
import { TRADITIONS, traditionFit, type TraditionCtx, type TraditionId } from "./traditions";
import type { FurnitureType, Scene, SceneObject } from "./types";

export interface Arrangement {
  tradition: TraditionId;
  scene: Scene;
  /** Pieces that ended up somewhere else (or turned). */
  moved: string[];
}

/** A step's spots, best for the tradition first: each tried for this piece alone (stable, so ties keep the kit's order). */
function* rank(scene: Scene, catalogId: string, options: Placement[], tradition: TraditionId, ctx: TraditionCtx): Generator<null, Placement[]> {
  const type = getCatalogItem(catalogId)?.type;
  if (tradition === "practical" || !type || options.length < 2) return options;
  const scored: { p: Placement; i: number; fit: number }[] = [];
  for (const [i, p] of options.entries()) {
    yield null;
    const res = addObject(scene, catalogId, p);
    scored.push({ p, i, fit: res.ok ? traditionFit(res.scene, tradition, ctx, [type]) : -99 });
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
    const res = yield* placeStep(working, [piece.catalogId], options, true);
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
