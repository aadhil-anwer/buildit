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

## Theme (Phase 0 step 4)

- **Not yet visually compared with the design doc.** Values come straight from the design files (generated tokens) and are asserted by tests, but no screenshot comparison exists until `npm run design:compare` (step 6). The error screen has no prototype counterpart; compare it against the "Scan failed" screen.
- **Deviation for you to approve: button labels use `accent700` (#7d5411), not the plain gold.** The prototype shows gold text, but plain gold is 3.2:1 on the background and fails WCAG AA for text (our rule). Strokes and icons stay gold. A test pins this (`contrast.test.ts`).
- **Prototype uses weight 500 for some headings; the system loads only 400 and 600.** Browsers fall back to the 400 face, so the app uses 400 too.
- **Arabic heading line-height** is taken from the design's per-variant values, not 1.85 (only body text gets 1.85). Check against the Arabic screens during design compare.
- **Type ramp has 8 styles** (display, hero, title, heading, button, body, label, caption): only what the README and `styles.css` state. Add a style, with its source, when a screen needs one.
- **Sheet primitive deferred to Phase 4** (it needs gestures and Reanimated). Icons: only back, check, scan, sliders so far; add as screens need them.
- **Chip height (40pt + 4pt hit slop) is a guess**; confirm from the editor screen's markup in Phase 4.
- **Skeleton ignores the "reduce motion" setting.** Honour it before launch.
- `npm run tokens` regenerates `tokens.generated.ts`; a test fails if it drifts from `design-docnew`. Node prints a harmless module-type warning when it runs.

## i18n (Phase 0 step 5)

- **Arabic for our own strings is unreviewed.** `errTitle` and `errBody` (src/i18n/strings.ts) are not in the design doc, so I wrote the Arabic myself. Have a native speaker check them; every new string outside the design doc needs the same.
- **No in-app language switch UI yet.** `setLanguage()` is built and tested (saves, flips RTL, reloads); the Settings screen that calls it arrives in Phase 3.
- **RTL has only been unit-tested** (direction flip + reload logic). It needs a real device or simulator pass; the design compare in step 6 covers layout.
- **Numbers are mapped by our own function** (Arabic-Indic digits, `٫`), not `Intl`, because Hermes' `Intl` support is uneven. Only numbers are converted; strings pass through unchanged.
- `npm run strings` regenerates `strings.generated.ts` from the prototype; a test fails if they drift or if English and Arabic disagree on keys or placeholders.
- **Icons must be imported one by one** (`lucide-react-native/icons/<name>`); lint enforces it. The barrel import made a cold test run take 13 minutes.

## Weakened checks (debt)

- **Legacy size/complexity limits.** 30 warnings in `packages/core` (`importers/roomplan`, `layout/{clearance,improve,placement,validate}`, `ops`, `summary`, two test files). `npm run lint` caps warnings at 30 so the count can only fall. Refactor these in Phase 1 (they are being changed anyway), then shrink `LEGACY` in `eslint.config.js` and the cap in `package.json`.
- **knip can't flag unused exports in `packages/core`** because every file is an entry point. Add `packages/core/src/index.ts` as the public API and make it the only entry.
- **`web/` is frozen** and excluded from lint, dead-code and duplicate checks. Only its tests and typecheck run.

## Unverified

- RoomPlan importer: tested on a synthetic scan only, not a real device export.
- AI agent loop: tested against a fake model client, never run against the live API.
- Parent folder `buildit/` still has copies of `CLAUDE.md`, `AGENTS.md`, `STACK.md`, `design-docnew/`; the repo copies in `app/` are the real ones. Delete the originals.
