import tseslint from "typescript-eslint";

const LEGACY = [
  "importers/roomplan", "layout/clearance", "layout/placement",
  "layout/validate", "ops", "summary",
].map((f) => `packages/core/src/${f}.ts`).concat(["packages/core/tests/layout.test.ts", "packages/core/tests/roomplan.test.ts"]);

export default tseslint.config(
  { ignores: ["**/node_modules", "**/.next", "design-docnew", "web", ".claude", "tools/fixtures", "**/*.config.*", "**/*.generated.ts"] },
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
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react-native", importNames: ["ActivityIndicator"], message: "No spinners (design system): use <Skeleton>." },
            { name: "lucide-react-native", message: "Import one icon at a time from lucide-react-native/icons/<name>; the barrel loads 3,700 files (cold test run 13 min)." },
          ],
        },
      ],
    },
  },
  // Structural i18n/RTL rules for app code (tests are exempt).
  {
    files: ["apps/mobile/src/**/*.{ts,tsx}", "tools/fixtures/**/*.{ts,tsx}"],
    ignores: ["**/*.test.*"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "JSXText[value=/\\S/]", message: "User-facing text goes through t()." },
        {
          selector: "JSXAttribute[name.name=/^(title|label|placeholder|alt|accessibilityLabel|accessibilityHint)$/] > Literal",
          message: "User-facing text goes through t().",
        },
        {
          selector: "Property[key.name=/^(left|right|(margin|padding)(Left|Right)|border(Left|Right).*|border(Top|Bottom)(Left|Right)Radius)$/]",
          message: "Use logical properties (start/end) so layouts mirror under RTL.",
        },
      ],
    },
  },
  // Legacy debt: these warn instead of fail, and `npm run lint` caps the warning count
  // so it can only go down. Remove a file from this list once it is under the limits.
  {
    files: LEGACY,
    rules: { "max-lines": "warn", "max-lines-per-function": "warn", complexity: "warn" },
  },
);
