import { readdirSync } from "node:fs";

const DESIGN = "../../design-docnew";
const DS = `${DESIGN}/_ds/${readdirSync(`${DESIGN}/_ds`).find((d) => d.startsWith("classical-"))}`;
/** [design-system CSS, handoff README]: the only sources the theme is allowed to read. */
export const DESIGN_FILES = [`${DS}/styles.css`, `${DESIGN}/design_handoff_buildit/README.md`];

const rgba = (v: string) =>
  v.replace(/color-mix\(in srgb, (#\w{6}) (\d+)%, transparent\)/g, (_, hex: string, pct: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${Number(pct) / 100})`;
  });
const camel = (s: string) => s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

export function buildTokens(css: string, readme: string) {
  const root = /:root\s*{([^}]*)}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  if (!root) throw new Error("design system CSS has no :root block");
  const vars = [...root[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, rgba(v.trim())] as const);
  const pick = <T>(prefix: string, f: (v: string) => T) =>
    Object.fromEntries(vars.filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [camel(k.slice(prefix.length)), f(v)]));

  const rust = /Rust for failing states (#\w{6}) \/ (#\w{6})/.exec(readme);
  if (!rust) throw new Error("Rust colours not found in the handoff README");
  const group = (label: string) => {
    const line = new RegExp(`${label}: ([^.]*)\\.`).exec(readme);
    if (!line) throw new Error(`"${label}" colours not found in the handoff README`);
    return Object.fromEntries([...line[1].matchAll(/(\w+) (#\w{6})/g)].map(([, name, hex]) => [name, hex]));
  };

  return {
    // accent-2 is a machine-made stand-in (the system is mono-accent), so it is left out.
    color: Object.fromEntries(Object.entries(pick("color-", String)).filter(([k]) => !k.startsWith("accent2"))),
    space: pick("space-", parseFloat),
    radius: pick("radius-", parseFloat),
    shadow: pick("shadow-", String),
    rust: { base: rust[1], dark: rust[2] },
    materials: { furniture: group("Furniture colours"), wall: group("Walls"), floor: group("Floors") },
  };
}
