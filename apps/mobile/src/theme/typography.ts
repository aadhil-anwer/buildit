/** One font file per weight: React Native does not synthesise weights for custom fonts. */
const FAMILY = {
  en: {
    heading: { 400: "CormorantGaramond_400Regular", 600: "CormorantGaramond_600SemiBold" },
    body: { 400: "Lora_400Regular", 600: "Lora_600SemiBold" },
  },
  ar: {
    heading: { 400: "Amiri_400Regular", 600: "Amiri_700Bold" },
    body: { 400: "NotoNaskhArabic_400Regular", 600: "NotoNaskhArabic_600SemiBold" },
  },
} as const;

/** [font role, weight, size, line-height]. Only styles the design states; grows with the screens. */
export const RAMP = {
  display: ["heading", 400, 46, 1], // README: My rooms H1 46
  hero: ["heading", 400, 38, 1.02], // README: Welcome headline 38/1.02
  title: ["heading", 400, 26, 1.1], // README: room name 26
  heading: ["heading", 600, 18, 1.1],
  brand: ["heading", 400, 26, 1], // prototype: Welcome logotype
  button14: ["heading", 600, 14, 1.2], // styles.css .btn
  button15: ["heading", 600, 15, 1.2], // prototype: text buttons ("Try without an account")
  button16: ["heading", 600, 16, 1.2], // prototype: Welcome buttons
  button17: ["heading", 600, 17, 1.2], // prototype: Scan a room
  body: ["body", 400, 15, 1.55], // styles.css body
  bodySm: ["body", 400, 14, 1.55], // styles.css .input, prototype subtitles
  small: ["body", 400, 13, 1.55], // prototype: way descriptions
  count: ["body", 400, 13, 1.55], // prototype: the room count
  section: ["heading", 400, 34, 1.05], // prototype: empty-state heading
  wayTitle: ["heading", 600, 19, 1.15], // prototype: the three ways in
  numeral: ["heading", 400, 30, 1], // prototype: way numbers
  control: ["body", 600, 14, 1.3], // prototype: language toggle
  label: ["body", 600, 13, 1.3],
  caption: ["body", 400, 12, 1.55],
} as const;
export type Variant = keyof typeof RAMP;

const TRACKED = new Set<Variant>(["brand", "display", "hero", "title", "section", "heading"]);
const PARAGRAPH = new Set<Variant>(["body", "bodySm", "small"]);

export function textStyle(variant: Variant, arabic: boolean) {
  const [role, weight, fontSize, lh] = RAMP[variant];
  const lineHeight = fontSize * (arabic && PARAGRAPH.has(variant) ? 1.85 : lh); // prototype --lh, set on paragraphs only
  const letterSpacing = arabic || !TRACKED.has(variant) ? 0 : -0.015 * fontSize; // prototype --ls0, set on these headings only
  return { fontFamily: FAMILY[arabic ? "ar" : "en"][role][weight], fontSize, lineHeight, letterSpacing };
}
