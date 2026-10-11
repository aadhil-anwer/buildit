import { expect, test } from "vitest";
import { roomCheck } from "../src/check";
import { improveLayoutSliced } from "../src/layout/improve";
import { largestFree } from "../src/layout/free-space";
import { layoutReport } from "../src/summary";
import { RECT_WALL, makeOpening } from "../src/room";
import { objectFromCatalogId } from "../src/scene";
import { emptyRoom, sampleLivingRoom } from "../src/templates";

// Time budgets. They guard against order-of-magnitude regressions (an accidental O(n^2) pass), not noise:
// each is about 5x what a laptop measures, and the time is the best of several batches so a busy CI machine
// does not flake. Hermes on a phone is several times slower: see STACK.md "Performance budget".
const ms = (f: () => unknown, batches = 5, runs = 4) => {
  f(); // warm up
  const times = Array.from({ length: batches }, () => {
    const start = Date.now();
    for (let i = 0; i < runs; i++) f();
    return (Date.now() - start) / runs;
  });
  return Math.min(...times);
};

const living = sampleLivingRoom(); // 9 objects
const fast = () => layoutReport(living, 0.1, { overlay: false }); // what the editor runs while you work

test("room check on a 10 cm grid (live updates) stays under 20 ms", () => expect(ms(() => roomCheck(living, fast()))).toBeLessThan(20));
test("room check on the exact 5 cm grid stays under 60 ms", () => expect(ms(() => roomCheck(living))).toBeLessThan(60));
test("largest free rectangle stays under 15 ms", () => expect(ms(() => largestFree(living))).toBeLessThan(15));

test("the optimizer hands control back often: no stretch longer than 150 ms", async () => {
  const scene = emptyRoom({ name: "T", width: 4, length: 4, height: 2.8, openings: [makeOpening("door", RECT_WALL.south, 0.3, 0.9)] });
  const blocked = { ...scene, objects: [objectFromCatalogId(scene, "wardrobe_3", { x: 2.3, z: 3.6, rotation: 0 })] };
  let last = Date.now();
  let longest = 0;
  await improveLayoutSliced(blocked, {}, { sliceMs: 8, pause: () => ((longest = Math.max(longest, Date.now() - last)), (last = Date.now()), Promise.resolve()) });
  expect(Math.max(longest, Date.now() - last)).toBeLessThan(150);
});
