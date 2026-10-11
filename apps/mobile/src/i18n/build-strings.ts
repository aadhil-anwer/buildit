import vm from "node:vm";

export const PROTOTYPE_FILE = "../../design-docnew/BuildIt Phone.dc.html";
type Dict = Record<string, string>;
const slots = (s: string) => [...new Set(s.match(/\{\d+\}/g) ?? [])].sort().join();

/** Lifts the EN/AR dictionary (`D = {…}`) out of the prototype and checks the two languages agree. */
export function extractStrings(html: string) {
  const dict = /^ {2}D = (\{[\s\S]*?\n {2}\});?$/m.exec(html);
  if (!dict) throw new Error("no string dictionary (D = {…}) found in the prototype");
  const { en, ar } = vm.runInNewContext(`(${dict[1]})`) as { en: Dict; ar: Dict };
  for (const k of Object.keys(en)) {
    if (!(k in ar)) throw new Error(`Arabic is missing "${k}"`);
    if (slots(en[k]) !== slots(ar[k])) throw new Error(`placeholders differ between languages for "${k}"`);
  }
  for (const k of Object.keys(ar)) if (!(k in en)) throw new Error(`English is missing "${k}"`);
  return { en, ar };
}
