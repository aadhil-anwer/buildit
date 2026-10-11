import { TYPE_INFO } from "@buildit/core";
import { t } from "@/i18n";
import { typeName } from "./names";

test("every furniture type the engine knows has a localised name (a new type fails here until it has one)", () => {
  for (const type of Object.keys(TYPE_INFO) as (keyof typeof TYPE_INFO)[]) expect(typeName(type)).toBeTruthy();
});

test("uses the design's own names where it has them", () => {
  expect(typeName("bed")).toBe(t("iBed"));
  expect(typeName("armchair")).toBe(t("iArm"));
  expect(typeName("round_table")).toBe(t("iTable"));
});
