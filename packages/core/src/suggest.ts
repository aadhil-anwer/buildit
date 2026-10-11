import type { Rule, RuleId } from "./check";
import { design } from "./design.generated";
import type { Placement } from "./layout/placement";
import { addObject, setColor, setFinish, type OpResult } from "./ops";
import type { Scene } from "./types";

/** An engine operation described as data, so a server or the phone can apply it the same way. */
export type Change =
  | { op: "add"; catalogId: string; placement: Placement }
  | { op: "finish"; wall: string }
  | { op: "color"; ids: string[]; color: string };

export interface Suggestion {
  id: "lamp" | "rug" | "wall" | "headboard";
  change: Change;
}

export const applyChange = (scene: Scene, c: Change): OpResult =>
  c.op === "add" ? addObject(scene, c.catalogId, c.placement) : c.op === "finish" ? setFinish(scene, { wall_color: c.wall }) : setColor(scene, c.ids, c.color);

/** What the side card can offer for this room, minus anything the user already dismissed. */
export function suggestions(scene: Scene, dismissed: string[]): Suggestion[] {
  const find = (type: string) => scene.objects.find((o) => o.type === type);
  const [desk, bed] = [find("desk"), find("bed")];
  const rugTarget = bed ?? find("coffee_table") ?? find("sofa");
  const { wall, furniture } = design.materials;
  const all: (Suggestion | false | undefined)[] = [
    desk && !find("floor_lamp") && { id: "lamp", change: { op: "add", catalogId: "floor_lamp", placement: { type: "near", target: desk.id } } },
    rugTarget && !find("rug") && { id: "rug", change: { op: "add", catalogId: "rug_small", placement: { type: "next_to", target: rugTarget.id, side: "under" } } },
    scene.room.wallColor === wall.chalk && { id: "wall", change: { op: "finish", wall: wall.sand } },
    bed?.color === furniture.sage && { id: "headboard", change: { op: "color", ids: [bed.id], color: furniture.clay } },
  ];
  return all.filter((s): s is Suggestion => !!s && !dismissed.includes(s.id));
}

export type NextStep = { id: "fix"; ruleId: RuleId } | { id: "rug" | "walk" | "save" | "style" };

/** The Ask tab's "Suggested next": the most useful few things to do, in priority order. */
export function nextSteps(scene: Scene, check: { rules: Rule[] }, ui: { walkOn: boolean; unsaved: boolean; styled: boolean }): NextStep[] {
  const failing = check.rules.find((r) => r.status !== "pass");
  const all: (NextStep | false | undefined)[] = [
    failing && { id: "fix", ruleId: failing.id },
    !scene.objects.some((o) => o.type === "rug") && { id: "rug" },
    !ui.walkOn && { id: "walk" },
    ui.unsaved && { id: "save" },
    !ui.styled && { id: "style" },
  ];
  return all.filter((s): s is NextStep => !!s).slice(0, 3);
}
