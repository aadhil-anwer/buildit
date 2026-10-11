import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { PRODUCT_TYPES, parseCsv, parseProductsCsv } from "../scripts/import-products";
import { TYPE_INFO, productToCatalogItem, type ProductRow } from "@/core/catalog";
import { encodeSceneForTest, sceneFromHash } from "@/editor/persist";
import { sampleLivingRoom } from "@/core/templates";

describe("product CSV import", () => {
  test("type list matches the catalog's furniture types", () => {
    const catalogTypes = Object.keys(TYPE_INFO).filter((t) => t !== "fixture").sort();
    expect([...PRODUCT_TYPES].sort()).toEqual(catalogTypes);
  });

  test("parses quoted fields", () => {
    expect(parseCsv('a,b\n"x, ""y""",2\r\n')).toEqual([
      ["a", "b"],
      ['x, "y"', "2"],
    ]);
  });

  test("example file imports cleanly and becomes priced catalog items", () => {
    const { products, errors } = parseProductsCsv(readFileSync("../packages/core/data/products.example.csv", "utf8"));
    expect(errors).toEqual([]);
    expect(products).toHaveLength(2);
    const item = productToCatalogItem(products[0] as ProductRow);
    expect(item.product?.price).toBeGreaterThan(0);
    expect(item.w).toBeCloseTo(products[0].width_cm / 100);
  });

  test("reports bad rows and refuses to import", () => {
    const csv = [
      "sku,name,shop,type,width_cm,depth_cm,height_cm,price",
      "A1,Sofa,Shop,sofa,220,90,85,300",
      "A1,Dup,Shop,sofa,220,90,85,300",
      "B2,Thing,Shop,spaceship,1,1,1,1",
      "C3,Table,Shop,coffee_table,abc,60,40,70",
    ].join("\n");
    const { errors } = parseProductsCsv(csv);
    expect(errors).toHaveLength(3);
    expect(errors.join(" ")).toMatch(/duplicate sku/);
    expect(errors.join(" ")).toMatch(/spaceship/);
    expect(errors.join(" ")).toMatch(/width_cm/);
  });
});

/**
 * Synthetic CapturedRoom in the shape RoomPlan's JSONEncoder output is
 * expected to have (flat column-major transforms, {"name": {}} categories).
 * Built by hand, not captured on a device.
 */
describe("share links", () => {
  test("round-trip a room through the URL fragment", () => {
    const scene = sampleLivingRoom();
    const back = sceneFromHash(encodeSceneForTest(scene));
    expect(back).toEqual(scene);
    expect(sceneFromHash("#room=garbage")).toBeNull();
  });
});
