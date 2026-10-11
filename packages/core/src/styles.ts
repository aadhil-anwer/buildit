import { design } from "./design.generated";
import type { OpResult } from "./ops";
import type { Scene } from "./types";

export type StyleKey = keyof typeof design.styles;
export const STYLE_KEYS = Object.keys(design.styles) as StyleKey[];

/** Applies a style's wall, floor and furniture colours. Never moves anything: only colours change. */
export function restyle(scene: Scene, key: StyleKey): OpResult {
  const style = design.styles[key];
  const colours: Record<string, string | undefined> = style.items;
  const objects = scene.objects.map((o) => (colours[o.type] && colours[o.type] !== o.color ? { ...o, color: colours[o.type] as string } : o));
  return {
    scene: { ...scene, room: { ...scene.room, wallColor: style.wall, floorColor: design.materials.floor[style.floor] }, objects },
    ok: true,
    message: `Restyled to ${key}. Furniture positions are unchanged.`,
    changed: objects.filter((o, i) => o !== scene.objects[i]).map((o) => o.id),
  };
}
