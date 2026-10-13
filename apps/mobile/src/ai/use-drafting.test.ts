import { sampleBedroom } from "@buildit/core";
import { touchedIds } from "./use-drafting";

const scene = sampleBedroom();

test("nothing is touched when the scenes are the same", () => expect(touchedIds(scene, scene)).toEqual([]));

test("a moved, turned, recoloured or added piece is touched; an untouched one is not", () => {
  const [a, b, c] = scene.objects;
  const after = { ...scene, objects: [{ ...a, x: a.x + 0.5 }, { ...b, color: "#123456" }, c, { ...c, id: "new_one" }] };
  expect(touchedIds(scene, after)).toEqual([a.id, b.id, "new_one"]);
});
