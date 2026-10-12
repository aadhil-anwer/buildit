import { sampleBedroom } from "@buildit/core";
import { planGeometry } from "@/rooms/plan";
import { draggedPose, hitItem } from "./plan-edit";

const scene = sampleBedroom();
const plan = planGeometry(scene, 360, 360, 12);
const bed = scene.objects.find((o) => o.type === "bed")!;
const drawn = plan.items.find((i) => i.id === bed.id)!;

test("a point on a piece hits it, a point in empty floor hits nothing", () => {
  expect(hitItem(plan.items, drawn.cx, drawn.cy)).toBe(bed.id);
  expect(hitItem(plan.items, 1, 1)).toBeNull();
});

test("a turned piece is hit where it is, not where its unturned box would be", () => {
  const item = { id: "a", cx: 100, cy: 100, w: 80, d: 20, rotation: 90 };
  expect(hitItem([item], 100, 135)).toBe("a"); // turned a quarter: now 20 wide, 80 tall
  expect(hitItem([item], 135, 100)).toBeNull();
});

test("where pieces overlap, the one drawn last (on top) wins", () => {
  const [a, b] = [{ id: "a", cx: 50, cy: 50, w: 40, d: 40, rotation: 0 }, { id: "b", cx: 60, cy: 50, w: 40, d: 40, rotation: 0 }];
  expect(hitItem([a, b], 55, 50)).toBe("b");
});

test("a drag moves a piece in whole 5 cm steps and keeps the turn", () => {
  const pose = draggedPose(bed, 30, -12, plan.scale);
  expect(pose.rotation).toBe(bed.rotation);
  expect((pose.x - bed.x) / 0.05).toBeCloseTo(Math.round((pose.x - bed.x) / 0.05), 6);
  expect((pose.z - bed.z) / 0.05).toBeCloseTo(Math.round((pose.z - bed.z) / 0.05), 6);
  expect(pose.x - bed.x).toBeCloseTo(30 / plan.scale, 1);
});

test("a drag that does not reach a step moves nothing", () => {
  const pose = draggedPose(bed, 0.4, -0.4, plan.scale);
  expect(pose).toEqual({ x: bed.x, z: bed.z, rotation: bed.rotation });
});
