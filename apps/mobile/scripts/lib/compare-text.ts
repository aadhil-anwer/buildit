/** One run of text and the computed style it was drawn with. */
export type Run = { text: string; family: string; size: number; weight: string; lh: string; ls: string; color: string };

const CLOCK = /^[\d٠-٩]{1,2}:[\d٠-٩]{2}$/; // the prototype's fake status bar
const family = (f: string) => f.split(",")[0].replace(/[^a-z]/gi, "").toLowerCase();
const num = (v: string) => (v === "normal" ? 0 : parseFloat(v));
// Our fonts are one family per weight ("Lora_600SemiBold"); the design loads only 400 and 600, so 500 draws as 400.
const weights = (p: Run, a: Run) => [p.weight === "500" ? "400" : p.weight, /_(\d{3})/.exec(a.family)?.[1] ?? "400"];

function styleIssues(p: Run, a: Run) {
  const [pw, aw] = weights(p, a);
  const checks: [string, boolean, unknown, unknown][] = [
    ["family", !family(a.family).startsWith(family(p.family)), family(p.family), a.family],
    ["weight", pw !== aw, pw, aw],
    ["size", Math.abs(p.size - a.size) > 0.5, p.size, a.size],
    ["lineHeight", p.lh !== "normal" && Math.abs(num(p.lh) - num(a.lh)) > 1, num(p.lh), num(a.lh)],
    ["letterSpacing", Math.abs(num(p.ls) - num(a.ls)) > 0.1, num(p.ls), num(a.ls)],
    ["color", p.color !== a.color, p.color, a.color],
  ];
  return checks.filter(([, differs]) => differs).map(([name, , want, got]) => `${name} "${p.text}": ${String(want)} → ${String(got)}`);
}

/** Matches text runs by their text and lists every style difference, missing string and extra string. */
export function compareText(design: Run[], built: Run[]) {
  const byText = new Map(built.map((r) => [r.text, r]));
  const issues: string[] = [];
  for (const p of design) {
    const a = byText.get(p.text);
    if (a) issues.push(...styleIssues(p, a));
    else if (!CLOCK.test(p.text)) issues.push(`missing in app: "${p.text}"`);
  }
  const known = new Set(design.map((r) => r.text));
  return issues.concat(built.filter((r) => !known.has(r.text)).map((r) => `not in design: "${r.text}"`));
}
