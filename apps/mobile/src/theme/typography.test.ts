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

test("only headings are tightened: buttons use the heading face with no letter-spacing", () => {
  expect(textStyle("button14", false).letterSpacing).toBe(0);
  expect(textStyle("heading", false).letterSpacing).toBeLessThan(0);
});

test("the prototype's own sizes: brand 26/1, small body 14, control 14 semibold, buttons 14 to 17", () => {
  expect(textStyle("brand", false)).toMatchObject({ fontFamily: "CormorantGaramond_400Regular", fontSize: 26, lineHeight: 26 });
  expect(textStyle("bodySm", false)).toMatchObject({ fontFamily: "Lora_400Regular", fontSize: 14 });
  expect(textStyle("control", false)).toMatchObject({ fontFamily: "Lora_600SemiBold", fontSize: 14 });
  expect([14, 15, 16, 17].map((n) => textStyle(`button${n}` as "button14", false).fontSize)).toEqual([14, 15, 16, 17]);
});
