import { Vector3 } from "three";
import { cameraOffset, clampElevation, clampZoom, facesCamera, fitView, START } from "./view";

test("the camera stands to the south-east at the design's angle", () => {
  const p = cameraOffset(START.az, START.el, 10);
  expect(p.length()).toBeCloseTo(10);
  expect(p.x).toBeGreaterThan(0);
  expect(p.z).toBeGreaterThan(0);
  expect(Math.asin(p.y / 10)).toBeCloseTo(START.el);
});

test("a room fits the view with the padding, and a smaller view zooms out", () => {
  const room = [new Vector3(0, 0, 0), new Vector3(4, 0, 0), new Vector3(4, 0, 3.5), new Vector3(0, 0, 3.5), new Vector3(0, 2.5, 0), new Vector3(4, 2.5, 3.5)];
  const big = fitView(room, START.az, START.el, 390, 400, 20).zoom;
  expect(fitView(room, START.az, START.el, 390, 200, 20).zoom).toBeLessThan(big);
  expect(fitView(room, START.az, START.el, 390, 400, 60).zoom).toBeLessThan(big);
});

test("the camera aims at the middle of what it frames, so the room sits centred", () => {
  const points = [new Vector3(0, 0, 0), new Vector3(4, 0, 3), new Vector3(4, 2.5, 3), new Vector3(0, 2.5, 0)];
  const { target } = fitView(points, START.az, START.el, 390, 400, 20);
  const back = cameraOffset(START.az, START.el, 1);
  const right = new Vector3(0, 1, 0).cross(back).normalize();
  const xs = points.map((p) => p.dot(right));
  expect(target.dot(right)).toBeCloseTo((Math.min(...xs) + Math.max(...xs)) / 2);
});

test("the view cannot be tilted flat or straight down, or zoomed out of reach", () => {
  expect(clampElevation(0)).toBeGreaterThan(0.1);
  expect(clampElevation(Math.PI / 2)).toBeLessThan(Math.PI / 2);
  expect(clampZoom(0.01)).toBe(0.6);
  expect(clampZoom(50)).toBe(3);
});

test("walls toward the camera are hidden and the far ones stay", () => {
  expect(facesCamera({ x: 0, z: 1 }, START.az)).toBe(true); // south
  expect(facesCamera({ x: 1, z: 0 }, START.az)).toBe(true); // east
  expect(facesCamera({ x: 0, z: -1 }, START.az)).toBe(false); // north
  expect(facesCamera({ x: -1, z: 0 }, START.az)).toBe(false); // west
});
