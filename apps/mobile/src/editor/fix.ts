import { improveLayoutSliced, type OpResult, type Scene } from "@buildit/core";

/** Looks for small moves and turns that clear the room's problems, pausing between slices so the screen keeps responding. */
export async function fixLayout(scene: Scene): Promise<OpResult> {
  const result = await improveLayoutSliced(scene, { budgetMs: 1500 }, { pause: () => new Promise((resolve) => setTimeout(resolve, 0)) });
  const moved = result.moved.map((m) => m.id);
  return { scene: moved.length ? result.scene : scene, ok: moved.length > 0, message: "", changed: moved };
}
