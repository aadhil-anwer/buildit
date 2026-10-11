import { render } from "@testing-library/react-native";
import { sampleBedroom } from "@buildit/core";
import { PlanView } from "./plan-view";

const count = (tree: string, type: string) => (tree.match(new RegExp(`"type":"${type}"`, "g")) ?? []).length;

test("draws the room outline and one rectangle per piece, scaled into a 360 x 196 box", async () => {
  const { toJSON } = await render(<PlanView scene={sampleBedroom()} />);
  const tree = JSON.stringify(toJSON());
  expect(count(tree, "RNSVGPath")).toBe(1);
  expect(count(tree, "RNSVGRect")).toBe(sampleBedroom().objects.length);
  expect(tree).toContain('"vbWidth":360,"vbHeight":196');
});
