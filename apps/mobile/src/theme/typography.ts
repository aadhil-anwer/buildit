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
  button: ["heading", 600, 14, 1.2], // styles.css .btn
  body: ["body", 400, 15, 1.55], // styles.css body
  label: ["body", 600, 13, 1.3],
  caption: ["body", 400, 12, 1.55],
} as const;
export type Variant = keyof typeof RAMP;

export function textStyle(variant: Variant, arabic: boolean) {
  const [role, weight, fontSize, lh] = RAMP[variant];
  const lineHeight = fontSize * (arabic && role === "body" ? 1.85 : lh); // prototype --lh
  const letterSpacing = arabic || role === "body" ? 0 : -0.015 * fontSize; // prototype --ls0
  return { fontFamily: FAMILY[arabic ? "ar" : "en"][role][weight], fontSize, lineHeight, letterSpacing };
}
