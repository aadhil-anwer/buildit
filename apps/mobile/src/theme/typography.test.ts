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

test("rooms-screen sizes: small 13, empty-state heading 34/1.05, way title 19/1.15 semibold, way numeral 30/1", () => {
  expect(textStyle("small", false)).toMatchObject({ fontFamily: "Lora_400Regular", fontSize: 13 });
  expect(textStyle("section", false)).toMatchObject({ fontFamily: "CormorantGaramond_400Regular", fontSize: 34, lineHeight: 34 * 1.05 });
  expect(textStyle("wayTitle", false)).toMatchObject({ fontFamily: "CormorantGaramond_600SemiBold", fontSize: 19 });
  expect(textStyle("numeral", false)).toMatchObject({ fontSize: 30, lineHeight: 30 });
});

test("only the headings the prototype marks are tightened; way titles, numerals and buttons are not", () => {
  for (const v of ["brand", "display", "hero", "title", "section", "heading"] as const) expect(textStyle(v, false).letterSpacing).toBeLessThan(0);
  for (const v of ["wayTitle", "numeral", "button14", "button17", "body", "caption", "count"] as const) expect(textStyle(v, false).letterSpacing).toBe(0);
});

test("Arabic gets the roomy 1.85 line-height on paragraphs only; counts, captions and labels keep 1.55", () => {
  for (const v of ["body", "bodySm", "small"] as const) expect(textStyle(v, true).lineHeight).toBeCloseTo(textStyle(v, true).fontSize * 1.85);
  for (const v of ["count", "caption", "label"] as const) expect(textStyle(v, true).lineHeight).toBeCloseTo(textStyle(v, false).lineHeight);
});

test("capture sizes: card title 24/1 and row title 22/1 semibold, tag 11", () => {
  expect(textStyle("cardTitle", false)).toMatchObject({ fontFamily: "CormorantGaramond_600SemiBold", fontSize: 24, lineHeight: 24 });
  expect(textStyle("rowTitle", false)).toMatchObject({ fontSize: 22, lineHeight: 22 });
  expect(textStyle("tag", false)).toMatchObject({ fontFamily: "Lora_400Regular", fontSize: 11 });
});

test("the kicker is a small uppercase, widely spaced label in English and plain in Arabic", () => {
  expect(textStyle("kicker", false)).toMatchObject({ fontSize: 11, textTransform: "uppercase" });
  expect(textStyle("kicker", false).letterSpacing).toBeCloseTo(0.88);
  expect(textStyle("kicker", true)).toMatchObject({ letterSpacing: 0 });
  expect(textStyle("kicker", true)).not.toHaveProperty("textTransform", "uppercase");
  expect(textStyle("kicker", false)).toMatchObject({ fontFamily: "CormorantGaramond_600SemiBold", lineHeight: 11 * 1.12 }); // h6 uses the heading face
});

test("plan labels are 11px semibold with line-height 1, and list rows keep 1.55 even in Arabic", () => {
  expect(textStyle("dim", false)).toMatchObject({ fontFamily: "Lora_600SemiBold", fontSize: 11, lineHeight: 11 });
  expect(textStyle("row", true).lineHeight).toBeCloseTo(14 * 1.55);
});
