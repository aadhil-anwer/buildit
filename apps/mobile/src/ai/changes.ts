import type { Scene, SceneObject } from "@buildit/core";
import { t, type StringKey } from "@/i18n";
import { typeName } from "@/rooms/names";

const MOVE_MIN = 0.05;
const LINES_SHOWN = 8;

/** Which way a piece moved, in the words of the design (z grows south). */
const direction = (dx: number, dz: number): StringKey => (Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? "dE" : "dW") : dz > 0 ? "dS" : "dN");

function movedLine(was: SceneObject, now: SceneObject): string | null {
  const [dx, dz] = [now.x - was.x, now.z - was.z];
  const metres = Math.hypot(dx, dz);
  if (metres >= MOVE_MIN) return t("aiMove", typeName(now.type), Math.round(metres * 100), t(direction(dx, dz)));
  return now.rotation !== was.rotation ? t("aiTurned", typeName(now.type)) : null;
}

/**
 * What the designer changed, in the person's language, worked out from the two rooms themselves (not from anything the
 * model said): pieces added, removed, moved (how far and which way), turned, recoloured, and the wall and floor finish.
 */
export function changeLines(before: Scene, after: Scene): string[] {
  const was = new Map(before.objects.map((o) => [o.id, o]));
  const lines: string[] = [];
  const recoloured: SceneObject[] = [];
  for (const now of after.objects) {
    const old = was.get(now.id);
    if (!old) lines.push(t("aiAdded", typeName(now.type)));
    else {
      const moved = movedLine(old, now);
      if (moved) lines.push(moved);
      if (old.color !== now.color) recoloured.push(now);
    }
  }
  for (const old of before.objects) if (!after.objects.some((o) => o.id === old.id)) lines.push(t("aiRemoved", typeName(old.type)));
  if (recoloured.length === 1) lines.push(t("aiRecolour", typeName(recoloured[0].type)));
  else if (recoloured.length > 1) lines.push(t("aiRecolourN", recoloured.length));
  if (before.room.wallColor !== after.room.wallColor) lines.push(t("aiWall"));
  if (before.room.floorColor !== after.room.floorColor) lines.push(t("aiFloor"));
  return lines.length > LINES_SHOWN ? [...lines.slice(0, LINES_SHOWN - 1), t("aiMore", lines.length - (LINES_SHOWN - 1))] : lines;
}
