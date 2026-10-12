import { sampleBedroom } from "@buildit/core";
import { LIMIT, push, redo, start, undo } from "./history";

const a = sampleBedroom();
const [b, c] = [{ ...a, id: "b" }, { ...a, id: "c" }];

test("a change can be undone and redone", () => {
  const h = push(push(start(a), b), c);
  expect(h.present).toBe(c);
  expect(undo(h).present).toBe(b);
  expect(undo(undo(h)).present).toBe(a);
  expect(redo(undo(h)).present).toBe(c);
});

test("undo and redo with nothing to go to change nothing", () => {
  const h = start(a);
  expect(undo(h)).toBe(h);
  expect(redo(h)).toBe(h);
});

test("a new change after undo drops what could have been redone", () => {
  const h = push(undo(push(start(a), b)), c);
  expect(h.future).toEqual([]);
  expect(h.past).toEqual([a]);
});

test("pushing the same scene is not a step", () => {
  const h = start(a);
  expect(push(h, a)).toBe(h);
});

test("only the last 50 steps are kept", () => {
  let h = start(a);
  for (let i = 0; i < LIMIT + 10; i++) h = push(h, { ...a, id: `s${i}` });
  expect(h.past).toHaveLength(LIMIT);
});
