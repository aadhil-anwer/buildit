import vm from "node:vm";

const DESIGN = "../../design-docnew";
/** [prototype, handoff README]: the only sources the engine's design data may come from. */
export const DESIGN_FILES = [`${DESIGN}/BuildIt Phone.dc.html`, `${DESIGN}/design_handoff_buildit/README.md`];
type Colours = Record<string, string>;

function group(readme: string, label: string): Colours {
  const line = new RegExp(`${label}: ([^.]*)\\.`).exec(readme);
  if (!line) throw new Error(`"${label}" colours not found in the handoff README`);
  return Object.fromEntries([...line[1].matchAll(/(\w+) (#\w{6})/g)].map(([, name, hex]) => [name, hex]));
}

/** Restyle tables from the prototype and material colours from the README, checked against each other. */
export function extractDesign(html: string, readme: string) {
  const table = /^ {2}STYLES = (\{.*\});$/m.exec(html);
  if (!table) throw new Error("STYLES table not found in the prototype");
  const raw = vm.runInNewContext(`(${table[1]})`) as Record<string, { n: string; wall: string; floor: string; items: Colours; dots: string[] }>;
  const materials = { furniture: group(readme, "Furniture colours"), wall: group(readme, "Walls"), floor: group(readme, "Floors") };
  const styles = Object.fromEntries(
    Object.entries(raw).map(([key, { n, ...style }]) => {
      if (!(style.floor in materials.floor)) throw new Error(`style "${key}" uses floor "${style.floor}", which the README does not list`);
      return [key, { label: n, ...style }];
    }),
  );
  return { styles, materials };
}
