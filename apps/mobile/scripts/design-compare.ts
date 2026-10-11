// Usage: npm run design:compare -- <prototype screen> [en|ar] [app route]
// Needs the app running on the web (npm run web). Writes screenshots and a diff to ./design-compare.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { chromium, type Page } from "playwright";
import { PNG } from "pngjs";
import { compareText, type Run } from "./lib/compare-text.ts";
import { serve } from "./lib/serve.ts";

const [screen, lang = "en", route = "/"] = process.argv.slice(2);
if (!screen) throw new Error("usage: npm run design:compare -- <prototype screen> [en|ar] [app route]");
const APP = (process.env.APP_URL as string | undefined) ?? "http://localhost:8081";
const DESIGN = resolve("../../design-docnew");
const OUT = "design-compare";

const COLLECT = `(() => {
  const out = [];
  const walk = (el) => {
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) return;
    for (const n of el.childNodes) {
      const text = n.nodeType === 3 ? n.textContent.trim().replace(/\\s+/g, " ") : "";
      if (text) {
        const s = getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        out.push({ text, family: s.fontFamily, size: parseFloat(s.fontSize), weight: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing, color: s.color, box: { x: r.x, y: r.y, w: r.width, h: r.height } });
      } else if (n.nodeType === 1) walk(n);
    }
  };
  walk(document.body);
  return out;
})()`;

async function capture(page: Page, url: string, name: string) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // fonts and entry animations
  const png = await page.screenshot({ path: `${OUT}/${name}.png` });
  return { png, runs: await page.evaluate<Run[]>(COLLECT) };
}

function diffImages(a: Buffer, b: Buffer) {
  const [x, y] = [PNG.sync.read(a), PNG.sync.read(b)];
  if (x.width !== y.width || x.height !== y.height) throw new Error(`screenshots differ in size: ${x.width}x${x.height} vs ${y.width}x${y.height}`);
  const out = new PNG({ width: x.width, height: x.height });
  const count = pixelmatch(x.data, y.data, out.data, x.width, x.height, { threshold: 0.1 });
  return { count, percent: (100 * count) / (x.width * x.height), image: PNG.sync.write(out) };
}

async function main() {
  await fetch(APP).catch(() => {
    throw new Error(`the app is not running at ${APP}; start it with: npm run web`);
  });
  mkdirSync(OUT, { recursive: true });
  const design = await serve(DESIGN);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const proto = await capture(page, `${design.url}/_screen.html?start=${screen}&lang=${lang}`, `${screen}.${lang}.design`);
    await context.addInitScript(`localStorage.setItem("language", "${lang}")`);
    const built = await capture(page, `${APP}${route}`, `${screen}.${lang}.app`);
    const diff = diffImages(proto.png, built.png);
    writeFileSync(`${OUT}/${screen}.${lang}.diff.png`, diff.image);
    const issues = compareText(proto.runs, built.runs);
    console.log(`${screen} (${lang}): ${diff.percent.toFixed(1)}% of pixels differ; ${issues.length} text issues\n${issues.join("\n")}\nfiles: ${OUT}/${screen}.${lang}.{design,app,diff}.png`);
  } finally {
    await browser.close();
    design.stop();
  }
}

await main();
