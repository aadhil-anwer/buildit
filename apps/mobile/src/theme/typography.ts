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
  tab: ["heading", 600, 17, 1.2], // prototype: sheet tabs
  chip: ["heading", 600, 15, 1.2], // prototype: restyle and ask chips
  pill: ["heading", 600, 14, 1.2], // prototype: the 3D / Plan pill
  versionName: ["heading", 600, 20, 1.1], // prototype: a version's name
  roomName: ["heading", 400, 22, 1], // prototype: the editor header's room name
  paneTitle: ["heading", 400, 22, 1.2], // prototype: sheet pane headings
  chipTitle: ["heading", 600, 15, 1.15], // prototype: room check chip title
  chipNote: ["body", 400, 11, 1.15], // prototype: room check chip finding
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
  cardTitle: ["heading", 600, 24, 1], // prototype: the recommended capture method
  rowTitle: ["heading", 600, 22, 1], // prototype: the other capture methods
  tag: ["body", 400, 11, 1.55], // styles.css .tag
  stepper: ["heading", 400, 56, 1], // prototype: the wall length stepper
  dialogTitle: ["heading", 400, 28, 1.05], // prototype: dialog headings
  setting: ["heading", 600, 18, 1.2], // prototype: Settings row titles
  page: ["heading", 400, 42, 1], // prototype: Settings and Share headings
  kicker: ["heading", 600, 11, 1.12], // prototype: section labels (h6: heading face, uppercase, 0.08em)
  dim: ["body", 600, 11, 1], // prototype: wall lengths on the plan
  row: ["body", 400, 14, 1.55], // prototype: list rows
  numeral: ["heading", 400, 30, 1], // prototype: way numbers
  control: ["body", 600, 14, 1.3], // prototype: language toggle
  label: ["body", 600, 13, 1.3],
  caption: ["body", 400, 12, 1.55],
  toast: ["body", 400, 13, 1.3], // prototype: the toast pill
} as const;
export type Variant = keyof typeof RAMP;

const TRACKED = new Set<Variant>(["brand", "display", "hero", "title", "section", "heading", "page", "roomName"]);
const PARAGRAPH = new Set<Variant>(["body", "bodySm", "small"]);

export function textStyle(variant: Variant, arabic: boolean) {
  const [role, weight, fontSize, lh] = RAMP[variant];
  // Prototype --lh (1.85 in Arabic) is set on paragraphs only; Arabic control labels set no line height at all, so the face decides.
  const lineHeight = arabic && variant === "control" ? undefined : fontSize * (arabic && PARAGRAPH.has(variant) ? 1.85 : lh);
  const letterSpacing = arabic || !TRACKED.has(variant) ? 0 : -0.015 * fontSize; // prototype --ls0, set on these headings only
  const style = { fontFamily: FAMILY[arabic ? "ar" : "en"][role][weight], fontSize, lineHeight, letterSpacing };
  // Section labels are uppercase and widely spaced in English; Arabic has no capitals and must not be spaced.
  return variant === "kicker" && !arabic ? { ...style, letterSpacing: 0.08 * fontSize, textTransform: "uppercase" as const } : style;
}
