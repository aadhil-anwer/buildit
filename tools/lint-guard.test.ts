import { ESLint } from "eslint";
import { expect, test } from "vitest";

const eslint = new ESLint({ cwd: import.meta.dirname + "/..", ignore: false });
const errorsIn = async (name: string) =>
  (await eslint.lintFiles(`tools/fixtures/${name}.ts`))[0].messages.filter((m) => m.severity === 2).map((m) => m.ruleId);

test.each([
  ["empty-catch", "no-empty"],
  ["floating-promise", "@typescript-eslint/no-floating-promises"],
  ["long-function", "max-lines-per-function"],
])("lint rejects %s", async (name, rule) => expect(await errorsIn(name)).toContain(rule));

test("lint accepts clean code", async () => expect(await errorsIn("clean")).toEqual([]));
