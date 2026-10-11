import { readFileSync } from "node:fs";
import { extractStrings, PROTOTYPE_FILE } from "./build-strings";
import { generated } from "./strings.generated";

const wrap = (en: string, ar: string) => `x\n  D = {\n    en: { ${en} },\n    ar: { ${ar} },\n  };\ny`;

test("extracts both languages from the prototype's dictionary", () =>
  expect(extractStrings(wrap("a: 'A {0}', b: 'B'", "a: 'ا {0}', b: 'ب'"))).toEqual({
    en: { a: "A {0}", b: "B" },
    ar: { a: "ا {0}", b: "ب" },
  }));

test.each([
  ["a language is missing a key", wrap("a: 'A', b: 'B'", "a: 'ا'"), /missing/],
  ["placeholders differ between languages", wrap("a: 'A {0} {1}'", "a: 'ا {0}'"), /placeholders/],
  ["there is no dictionary", "nothing here", /dictionary/],
])("fails loudly when %s", (_name, html, message) => expect(() => extractStrings(html)).toThrow(message));

test("generated strings match the prototype exactly (run npm run strings if this fails)", () =>
  expect(generated).toEqual(extractStrings(readFileSync(PROTOTYPE_FILE, "utf8"))));
