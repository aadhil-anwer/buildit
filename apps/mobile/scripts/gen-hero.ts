// Saves the prototype's rendered room (the Welcome screen's hero plate) as assets/hero.png.
// Until the app renders its own rooms (Phase 4), this is the only source for that picture.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { serve } from "./lib/serve.ts";

const design = await serve(resolve("../../design-docnew"));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${design.url}/_screen.html?start=welcome&lang=en`, { waitUntil: "networkidle" });
  await page.waitForFunction(`document.querySelector(".plate img")?.src.startsWith("data:image")`);
  const src = await page.evaluate<string>(`document.querySelector(".plate img").src`);
  if (!src.startsWith("data:image/png;base64,")) throw new Error(`the hero is no longer a PNG data URL: ${src.slice(0, 30)}`);
  mkdirSync("assets", { recursive: true });
  writeFileSync("assets/hero.png", Buffer.from(src.split(",")[1], "base64"));
} finally {
  await browser.close();
  design.stop();
}
