import { ESLint } from "eslint";
import { expect, test } from "vitest";

const eslint = new ESLint({ cwd: import.meta.dirname + "/..", ignore: false });
const errorsIn = async (name: string) =>
  (await eslint.lintFiles(`tools/fixtures/${name}`))[0].messages.filter((m) => m.severity === 2).map((m) => m.ruleId);

test.each([
  ["empty-catch.ts", "no-empty"],
  ["floating-promise.ts", "@typescript-eslint/no-floating-promises"],
  ["long-function.ts", "max-lines-per-function"],
  ["spinner.ts", "no-restricted-imports"],
  ["lucide-barrel.ts", "no-restricted-imports"],
  ["raw-text.tsx", "no-restricted-syntax"],
  ["left-style.ts", "no-restricted-syntax"],
])("lint rejects %s", async (name, rule) => expect(await errorsIn(name)).toContain(rule));

test("lint accepts clean code", async () => expect(await errorsIn("clean.ts")).toEqual([]));
