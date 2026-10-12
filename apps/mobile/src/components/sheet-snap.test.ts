import { fitHeights, nextSnap, settleSnap, SNAP_HEIGHT } from "./sheet-snap";

test("the grabber cycles peek, half, full and back", () => {
  expect(nextSnap("peek")).toBe("half");
  expect(nextSnap("half")).toBe("full");
  expect(nextSnap("full")).toBe("peek");
});

test("heights are the design's on a tall phone and fit a short one", () => {
  expect(fitHeights(844, 70)).toEqual(SNAP_HEIGHT);
  expect(fitHeights(600, 70)).toEqual({ peek: 196, half: 404, full: 530 });
  expect(fitHeights(300, 70).full).toBe(230);
  expect(fitHeights(200, 70)).toEqual({ peek: 196, half: 196, full: 196 });
});

test.each([
  [300, 0, "peek"], // the exact midpoint goes to the lower size
  [301, 0, "half"],
  [330, 0, "half"],
  [500, 0, "half"],
  [530, 0, "full"],
  [250, 0, "peek"],
  [250, 800, "half"], // a fast flick up carries it further
  [404, -2500, "peek"], // a fast flick down
  [640, 3000, "full"], // cannot overshoot the tallest
])("released at %i pt with %i pt/s up settles on %s", (height, velocity, expected) => {
  expect(settleSnap(height, velocity, SNAP_HEIGHT)).toBe(expected);
});
