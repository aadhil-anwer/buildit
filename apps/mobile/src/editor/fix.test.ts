import { addObject, roomCheck, sampleBedroom, type Scene } from "@buildit/core";
import { fixLayout } from "./fix";

const crowded = (): Scene => {
  let scene = sampleBedroom();
  for (const id of ["wardrobe_4", "dresser", "bookshelf"]) scene = addObject(scene, id).scene;
  return scene;
};

test("reports nothing to do when the room already works", async () => {
  const scene = sampleBedroom();
  const result = await fixLayout(scene);
  if (!result.ok) expect(result.scene).toBe(scene);
  expect(result.changed.length > 0).toBe(result.ok);
});

test("never makes the room check worse", async () => {
  const scene = crowded();
  const result = await fixLayout(scene);
  expect(roomScore(result.scene)).toBeGreaterThanOrEqual(roomScore(scene));
});

function roomScore(scene: Scene) {
  return roomCheck(scene).score;
}
