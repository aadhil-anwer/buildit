import { compareText, type Run } from "./compare-text";

const run = (over: Partial<Run> = {}): Run => ({
  text: "My rooms", family: '"Cormorant Garamond", serif', size: 46, weight: "400", lh: "46px", ls: "-0.69px", color: "rgb(32, 31, 29)",
  box: { x: 24, y: 84, w: 130, h: 46 }, ...over,
});
const app = (over: Partial<Run> = {}): Run => run({ family: "CormorantGaramond_400Regular", ...over });

test("identical styles produce no issues", () => expect(compareText([run()], [app()])).toEqual([]));

test("our per-weight font names match the design's family and weight", () =>
  expect(compareText([run({ weight: "600" })], [app({ family: "CormorantGaramond_600SemiBold" })])).toEqual([]));

test("weight 500 in the design counts as 400 (the system only loads 400 and 600)", () =>
  expect(compareText([run({ weight: "500" })], [app()])).toEqual([]));

test("reports each differing value with the text, design value and built value", () => {
  const issues = compareText([run()], [app({ size: 40, color: "rgb(0, 0, 0)", family: "Lora_400Regular" })]);
  expect(issues).toEqual([
    'family "My rooms": cormorantgaramond → Lora_400Regular',
    'size "My rooms": 46 → 40',
    'color "My rooms": rgb(32, 31, 29) → rgb(0, 0, 0)',
  ]);
});

test("ignores sub-pixel rounding but not real line-height differences", () => {
  expect(compareText([run()], [app({ lh: "46.3px", ls: "-0.7px" })])).toEqual([]);
  expect(compareText([run()], [app({ lh: "60px" })])).toEqual(['lineHeight "My rooms": 46 → 60']);
});

test("reports copy missing from the app and text the design does not have; ignores the status-bar clock", () =>
  expect(compareText([run(), run({ text: "9:41" }), run({ text: "Rooms" })], [app(), app({ text: "Extra" })])).toEqual([
    'missing in app: "Rooms"',
    'not in design: "Extra"',
  ]));

test("Amiri has no 600 cut, so the design's 600 is our 700", () =>
  expect(compareText([run({ weight: "600", family: "Amiri, serif" })], [app({ family: "Amiri_700Bold" })])).toEqual([]));

test("reports a position or size that differs by more than 2px", () => {
  expect(compareText([run()], [app({ box: { x: 24, y: 91, w: 130, h: 46 } })])).toEqual(['position "My rooms": 24,84 → 24,91']);
  expect(compareText([run()], [app({ box: { x: 24, y: 84, w: 150, h: 70 } })])).toEqual(['box "My rooms": 130×46 → 150×70']);
  expect(compareText([run()], [app({ box: { x: 25, y: 85, w: 131, h: 47 } })])).toEqual([]);
});
