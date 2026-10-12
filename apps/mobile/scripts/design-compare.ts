// Usage: npm run design:compare -- <prototype screen> [en|ar] [app route]
// Needs the app running on the web (npm run web). Writes screenshots and a diff to ./design-compare.
// UNPKG_DIR=<dir> serves the prototype's unpkg libraries (react, react-dom, @babel/standalone) from <dir>/<pkg>@<version>/... when unpkg is blocked.
// CHROMIUM_PATH=<binary> uses a browser that is already installed (cloud containers).
// COMPARE_GUEST=1 signs in as a guest first; COMPARE_SEED=rooms also gives the app the prototype's three rooms.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { chromium, type Page } from "playwright";
import { PNG } from "pngjs";
import { compareText, type Run } from "./lib/compare-text.ts";
import { seedRooms } from "./lib/seed-rooms.ts";
import { generated } from "../src/i18n/strings.generated.ts";
import { serve } from "./lib/serve.ts";

const [screen, lang = "en", route = "/"] = process.argv.slice(2);
if (!screen) throw new Error("usage: npm run design:compare -- <prototype screen> [en|ar] [app route]");
const env = (name: string) => process.env[name] as string | undefined;
const APP = env("APP_URL") ?? "http://localhost:8081";
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

/** Answers the prototype's unpkg requests from a local folder, for networks that block unpkg. */
async function serveUnpkgLocally(page: Page, dir: string) {
  await page.route("https://unpkg.com/**", (route) => {
    const file = resolve(dir, decodeURIComponent(new URL(route.request().url()).pathname.slice(1)));
    if (existsSync(file)) return route.fulfill({ body: readFileSync(file), contentType: "text/javascript" });
    return route.continue();
  });
}

async function capture(page: Page, url: string, name: string) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // fonts and entry animations
  const png = await page.screenshot({ path: `${OUT}/${name}.png` });
  return { png, runs: await page.evaluate<Run[]>(COLLECT) };
}

async function signInAsGuest(page: Page, lang: "en" | "ar") {
  await page.goto(`${APP}/welcome`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: generated[lang].wTry }).click();
  await page.waitForURL("**/rooms");
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
  const browser = await chromium.launch({ executablePath: env("CHROMIUM_PATH"), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    if (env("UNPKG_DIR")) await serveUnpkgLocally(page, env("UNPKG_DIR") as string);
    const proto = await capture(page, `${design.url}/_screen.html?start=${screen}&lang=${lang}`, `${screen}.${lang}.design`);
    await context.addInitScript(`localStorage.setItem("language", "${lang}")`);
    if (env("COMPARE_SEED") === "rooms") await context.addInitScript(`localStorage.setItem("rooms", ${JSON.stringify(seedRooms(lang as "en" | "ar"))})`);
    if (env("COMPARE_GUEST")) await signInAsGuest(page, lang as "en" | "ar");
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
