# Open issues

## Owner to-do (things only you can do)

Tick them off here. "Needed by" is the phase that gets blocked without it.

- [ ] **Sentry account** + a project for the app and one for the Edge Function; send me the DSNs, never the auth token in chat. Needed by: Phase 0 step 3 (now).
- [ ] **Expo account** + `npx eas-cli login` and `eas init` (type `! eas login` here). Needed by: Phase 0 step 3.
- [ ] **Supabase project** (free tier is fine to start): project URL, anon key, and a service-role key kept only in Supabase secrets. Needed by: Phase 2.
- [ ] **Anthropic API key** for the AI designer (server-side secret only). Needed by: Phase 5.
- [ ] **Apple Developer account** ($99/year, takes a day or two to approve). Needed by: Phase 4 on-device testing, required for Phase 6 and the App Store.
- [ ] **Tell me your iPhone model.** RoomPlan LiDAR scanning needs a Pro model (12 Pro or later). Needed by: Phase 6.
- [ ] **Google Play developer account** ($25 once). Needed by: Phase 7.
- [ ] **Final app name** (BuildIt is a working name), plus a domain, support email, privacy policy and terms of service. Needed by: Phase 8 (the name by Phase 3 if you want it on screens).
- [ ] **Delete the old copies** in `/home/zorothepirate/buildit/`: `CLAUDE.md`, `AGENTS.md`, `STACK.md`, `design-docnew/`, `design-doc.zip`, `design-docnew.zip`. The real ones are in `app/`. Do it when you're happy; I won't delete without your say.
- [ ] **Decide the GitHub plan:** I push to `origin` (aadhil-anwer/buildit) on branch `claude/jolly-bell-hhwtu2` at least once a day. Tell me when to merge to the main branch.
- [ ] **Real-phone testing** when builds exist: an older or mid-range phone if you have one, because it shows the worst frame rates. Needed by: Phase 4.

Live list of what is unverified, deferred or temporarily weakened. Update it when you leave something undone.

## Expo shell (Phase 0 step 3)

- **EAS Observe not wired yet.** Needs the Expo account and `eas init`; then add `expo-observe` per the eas-observe skill.
- **Sentry needs your DSN** (`EXPO_PUBLIC_SENTRY_DSN`). In development a missing DSN is allowed; a production build throws at startup without one, so no release build can silently drop errors. The Sentry Expo plugin also wants `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` at EAS build time (source maps).
- **`expo-updates` is installed but unconfigured.** Run `eas update:configure` after `eas init`, then set `runtimeVersion: { policy: "appVersion" }` as CLAUDE.md requires.
- **No bundle identifier / package name yet** in `app.json` (waits for the final app name, Phase 8).
- **Error screen is unstyled English text.** Restyle with the design tokens (step 4) and move strings into `t()` (step 5), then design-compare it.
- **React is pinned to 19.2.3 in the root `package.json`** (devDependencies and overrides). React Native 0.86 needs exactly that version; without the pin npm hoists 19.3 and tests break with "Invalid hook call". Keep web and mobile on the same version.
- `npm ls` shows an invalid peer for `react-native-worklets` (from `expo-modules-core`); harmless until we use Reanimated in Phase 4, then align it with `npx expo install`.
- Jest prints `console.error` noise from the report tests; silence it with a shared setup file if it hides real failures.

## Weakened checks (debt)

- **Legacy size/complexity limits.** 30 warnings in `packages/core` (`importers/roomplan`, `layout/{clearance,improve,placement,validate}`, `ops`, `summary`, two test files). `npm run lint` caps warnings at 30 so the count can only fall. Refactor these in Phase 1 (they are being changed anyway), then shrink `LEGACY` in `eslint.config.js` and the cap in `package.json`.
- **knip can't flag unused exports in `packages/core`** because every file is an entry point. Add `packages/core/src/index.ts` as the public API and make it the only entry.
- **`web/` is frozen** and excluded from lint, dead-code and duplicate checks. Only its tests and typecheck run.

## Unverified

- RoomPlan importer: tested on a synthetic scan only, not a real device export.
- AI agent loop: tested against a fake model client, never run against the live API.
- Parent folder `buildit/` still has copies of `CLAUDE.md`, `AGENTS.md`, `STACK.md`, `design-docnew/`; the repo copies in `app/` are the real ones. Delete the originals.
