import { FONT_FILES } from "./fonts";
import { RAMP, textStyle, type Variant } from "./typography";

const variants = Object.keys(RAMP) as Variant[];

test.each(variants.flatMap((v) => [[v, false] as const, [v, true] as const]))(
  "%s (arabic: %s) names a loaded fontFamily and no fontWeight",
  (variant, arabic) => {
    const style = textStyle(variant, arabic);
    expect(Object.keys(FONT_FILES)).toContain(style.fontFamily);
    expect(style).not.toHaveProperty("fontWeight");
  },
);

test("English matches the design: display 46/1 Cormorant 400, headings tighten by -0.015em", () => {
  expect(textStyle("display", false)).toMatchObject({ fontFamily: "CormorantGaramond_400Regular", fontSize: 46, lineHeight: 46 });
  expect(textStyle("heading", false).letterSpacing).toBeCloseTo(-0.27);
});

test("Arabic body uses line-height 1.85 and no letter-spacing; English body 1.55", () => {
  expect(textStyle("body", true)).toMatchObject({ fontFamily: "NotoNaskhArabic_400Regular", lineHeight: 15 * 1.85, letterSpacing: 0 });
  expect(textStyle("body", false).lineHeight).toBeCloseTo(15 * 1.55);
});
