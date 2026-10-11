import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { DESIGN_FILES, extractDesign } from "../scripts/design-extract";
import { design } from "../src/design.generated";

const html = `x\n  STYLES = { scandi: { n: 'stScandi', wall: '#efe9e0', floor: 'ash', items: { bed: '#cfd3cb' }, dots: ['#efe9e0', '#d9ccb7', '#a6ad9b'] } };\ny`;
const readme = "Furniture colours: wood #b88d62, linen #ece6da. Walls: chalk #efe9e0. Floors: oak #c9a97f, ash #d9ccb7.";

test("lifts styles and materials out of the design files", () =>
  expect(extractDesign(html, readme)).toEqual({
    styles: { scandi: { label: "stScandi", wall: "#efe9e0", floor: "ash", items: { bed: "#cfd3cb" }, dots: ["#efe9e0", "#d9ccb7", "#a6ad9b"] } },
    materials: { furniture: { wood: "#b88d62", linen: "#ece6da" }, wall: { chalk: "#efe9e0" }, floor: { oak: "#c9a97f", ash: "#d9ccb7" } },
  }));

test.each([
  ["the styles table is missing", "nothing", readme, /STYLES/],
  ["a style names a floor the README does not list", html.replace("'ash'", "'lava'"), readme, /lava/],
  ["the README has no colours", html, "nothing", /colours/],
])("fails loudly when %s", (_name, h, r, message) => expect(() => extractDesign(h, r)).toThrow(message));

test("generated design data matches the design files exactly (run npm run design if this fails)", () => {
  const [h, r] = DESIGN_FILES.map((p) => readFileSync(p, "utf8"));
  expect(design).toEqual(extractDesign(h, r));
});
