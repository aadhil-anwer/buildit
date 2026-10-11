import { tokens } from "./tokens.generated";

const lum = (hex: string) =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const { color, rust } = tokens;

// WCAG 2.1 AA: 4.5 for text, 3 for large text and interface chrome.
test.each([
  ["text on bg", color.text, color.bg, 4.5],
  ["text on surface", color.text, color.surface, 4.5],
  ["accent700 (accent as text) on bg", color.accent700, color.bg, 4.5],
  ["secondary text neutral700 on bg", color.neutral700, color.bg, 4.5],
  ["rust (failing state) on bg", rust.dark, color.bg, 4.5],
  ["accent (strokes, icons, large text) on bg", color.accent, color.bg, 3],
])("%s meets AA", (_name, fg, bg, min) => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(min));

test("the plain accent is NOT safe for body text (so nobody uses it)", () =>
  expect(ratio(color.accent, color.bg)).toBeLessThan(4.5));
