import { readFileSync } from "node:fs";
import { buildTokens, DESIGN_FILES } from "./build-tokens";
import { tokens } from "./tokens.generated";

const css = `:root {
  --color-bg: #f3f2f2; --color-accent: #b68235; --color-accent-700: #7d5411;
  --color-divider: color-mix(in srgb, #201f1d 16%, transparent); /* note; with semicolon */
  --space-1: 4.6px; --radius-md: 4px; --font-heading-weight: 600;
  --shadow-sm: 0 1px 2px color-mix(in srgb, #2d2b2b 14%, transparent);
}`;
const readme = `Rust for failing states #a04828 / #8c3a1c (added).
Furniture colours: wood #b88d62, linen #ece6da. Walls: chalk #efe9e0. Floors: oak #c9a97f.`;

test("converts the design-system CSS into typed values", () => {
  const t = buildTokens(css, readme);
  expect(t.color).toMatchObject({ bg: "#f3f2f2", accent700: "#7d5411", divider: "rgba(32, 31, 29, 0.16)" });
  expect(t.space).toEqual({ 1: 4.6 });
  expect(t.radius).toEqual({ md: 4 });
  expect(t.shadow.sm).toBe("0 1px 2px rgba(45, 43, 43, 0.14)");
  expect(t.rust).toEqual({ base: "#a04828", dark: "#8c3a1c" });
  expect(t.materials).toEqual({ furniture: { wood: "#b88d62", linen: "#ece6da" }, wall: { chalk: "#efe9e0" }, floor: { oak: "#c9a97f" } });
});

test("fails loudly when the design files change shape", () => {
  expect(() => buildTokens("body {}", readme)).toThrow(/:root/);
  expect(() => buildTokens(css, "nothing here")).toThrow(/Rust/);
});

test("generated tokens match the design files exactly (run npm run tokens if this fails)", () => {
  const [cssPath, readmePath] = DESIGN_FILES.map((p) => readFileSync(p, "utf8"));
  expect(tokens).toEqual(buildTokens(cssPath, readmePath));
});

test("the accent is the one from the design system", () => expect(tokens.color.accent).toBe("#b68235"));
