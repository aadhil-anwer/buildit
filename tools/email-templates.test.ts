import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const config = readFileSync("supabase/config.toml", "utf8");

// The app asks people to type the six-digit code, so every sign-in email must contain it ({{ .Token }}).
// Supabase's default sign-in email is a link only, which made email sign-in impossible.
test.each(["magic_link", "confirmation"])("the %s email shows the sign-in code", (kind) => {
  const section = new RegExp(`\\[auth\\.email\\.template\\.${kind}\\]([^\\[]*)`).exec(config);
  expect(section, `config.toml must set a ${kind} template`).not.toBeNull();
  const path = /content_path\s*=\s*"\.?\/?([^"]+)"/.exec(section![1])?.[1];
  expect(path, `the ${kind} template needs a content_path`).toBeTruthy();
  expect(readFileSync(path!, "utf8")).toContain("{{ .Token }}");
});
