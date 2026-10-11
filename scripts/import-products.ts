/**
 * Turn a shop's product spreadsheet (CSV) into data/products.json, which
 * the catalog loads. Each row becomes a real, priced item in the editor,
 * drawn with the generic 3D model of its type at its real size.
 *
 *   npm run import-products -- path/to/products.csv
 *
 * Columns (header row required; see data/products.example.csv):
 *   sku, name, shop, type, width_cm, depth_cm, height_cm, price, currency,
 *   color, seats, in_stock, url
 *
 * Nothing is written if any row has an error.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Must match the furniture types in src/core/catalog.ts (a test checks this). */
export const PRODUCT_TYPES = [
  "sofa",
  "armchair",
  "majlis_seat",
  "ottoman",
  "bench",
  "coffee_table",
  "side_table",
  "tv_unit",
  "dining_table",
  "round_table",
  "dining_chair",
  "bed",
  "nightstand",
  "wardrobe",
  "dresser",
  "sideboard",
  "bookshelf",
  "desk",
  "office_chair",
  "rug",
  "floor_lamp",
  "plant",
] as const;

export interface ProductOut {
  sku: string;
  name: string;
  shop: string;
  type: (typeof PRODUCT_TYPES)[number];
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  price: number;
  currency: string;
  color: string;
  seats?: number;
  in_stock: boolean;
  url?: string;
}

/** Minimal RFC 4180 CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const REQUIRED = ["sku", "name", "shop", "type", "width_cm", "depth_cm", "height_cm", "price"] as const;

export function parseProductsCsv(text: string): { products: ProductOut[]; errors: string[] } {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const errors: string[] = [];
  if (!rows.length) return { products: [], errors: ["The file is empty."] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  for (const col of REQUIRED) if (!header.includes(col)) errors.push(`Missing column "${col}".`);
  if (errors.length) return { products: [], errors };
  const get = (r: string[], col: string) => (header.indexOf(col) >= 0 ? (r[header.indexOf(col)] ?? "").trim() : "");

  const products: ProductOut[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const err = (m: string) => errors.push(`Row ${line}: ${m}`);
    const sku = get(r, "sku");
    const type = get(r, "type").toLowerCase();
    const num = (col: string) => Number(get(r, col).replace(",", "."));
    if (!sku) return err("sku is empty");
    if (!/^[\w.-]+$/.test(sku)) return err(`sku "${sku}" may only contain letters, digits, - _ .`);
    if (seen.has(sku)) return err(`duplicate sku "${sku}"`);
    seen.add(sku);
    if (!get(r, "name")) return err("name is empty");
    if (!get(r, "shop")) return err("shop is empty");
    if (!(PRODUCT_TYPES as readonly string[]).includes(type)) return err(`type "${type}" is not one of: ${PRODUCT_TYPES.join(", ")}`);
    for (const col of ["width_cm", "depth_cm", "height_cm"]) {
      const v = num(col);
      if (!Number.isFinite(v) || v <= 0 || v > 1000) return err(`${col} must be a number of centimetres (got "${get(r, col)}")`);
    }
    const price = num("price");
    if (!Number.isFinite(price) || price < 0) return err(`price must be a number (got "${get(r, "price")}")`);
    const color = get(r, "color") || "#b9b2a6";
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return err(`color must look like #c9bba5 (got "${color}")`);
    const seatsRaw = get(r, "seats");
    const seats = seatsRaw ? Number(seatsRaw) : undefined;
    if (seats !== undefined && (!Number.isInteger(seats) || seats < 0 || seats > 20)) return err(`seats must be a whole number (got "${seatsRaw}")`);
    const stock = get(r, "in_stock").toLowerCase();
    const in_stock = stock === "" || ["yes", "y", "true", "1"].includes(stock);
    if (stock && !in_stock && !["no", "n", "false", "0"].includes(stock)) return err(`in_stock must be yes or no (got "${stock}")`);
    const url = get(r, "url") || undefined;
    products.push({
      sku,
      name: get(r, "name"),
      shop: get(r, "shop"),
      type: type as ProductOut["type"],
      width_cm: num("width_cm"),
      depth_cm: num("depth_cm"),
      height_cm: num("height_cm"),
      price,
      currency: (get(r, "currency") || "OMR").toUpperCase(),
      color: color.toLowerCase(),
      ...(seats !== undefined ? { seats } : {}),
      in_stock,
      ...(url ? { url } : {}),
    });
  });
  products.sort((a, b) => a.shop.localeCompare(b.shop) || a.name.localeCompare(b.name));
  return { products, errors };
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npm run import-products -- path/to/products.csv");
    process.exit(2);
  }
  const { products, errors } = parseProductsCsv(readFileSync(input, "utf8"));
  if (errors.length) {
    console.error(`Not imported. Fix these ${errors.length} problem(s) first:\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  const out = fileURLToPath(new URL("../data/products.json", import.meta.url));
  writeFileSync(out, `${JSON.stringify(products, null, 2)}\n`);
  const shops = [...new Set(products.map((p) => p.shop))];
  console.log(`Imported ${products.length} products from ${shops.length} shop(s): ${shops.join(", ")}.`);
  console.log(`Wrote ${out}. Rebuild or restart the app to see them under "From shops".`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
