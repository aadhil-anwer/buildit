import tseslint from "typescript-eslint";

const LEGACY = [
  "importers/roomplan", "layout/clearance", "layout/improve", "layout/placement",
  "layout/validate", "ops", "summary",
].map((f) => `packages/core/src/${f}.ts`).concat(["packages/core/tests/layout.test.ts", "packages/core/tests/roomplan.test.ts"]);

export default tseslint.config(
  { ignores: ["**/node_modules", "**/.next", "design-docnew", "web", ".claude", "tools/fixtures", "**/*.config.*"] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "no-empty": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
      complexity: ["error", 12],
    },
  },
  // Legacy debt: these warn instead of fail, and `npm run lint` caps the warning count
  // so it can only go down. Remove a file from this list once it is under the limits.
  {
    files: LEGACY,
    rules: { "max-lines": "warn", "max-lines-per-function": "warn", complexity: "warn" },
  },
);
