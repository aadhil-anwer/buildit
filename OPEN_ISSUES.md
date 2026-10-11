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

## Pending work

What is planned but not done, in build order. Done phases are in `git log`; detail for each phase is in the plan (`~/.claude/plans/stateful-napping-aurora.md`).

**Phase 3, entry screens (in progress)**
- [x] Navigation wired (signed-out → Welcome, signed-in → My rooms) and Welcome compared in EN and AR. Email sign-in has no prototype screen (built in the same scheme, not compared).
- [x] My rooms (list, empty state, "Scan a room") built and compared.
- [ ] Capture chooser, Type dimensions, Scan review (plan view, ±5 cm wall steppers, furniture list), Settings (language, walkway 90/75, AI usage, sign out, delete account).
- [ ] Local-first rooms with sync to Supabase, and clear offline / failed-sync states.
- [ ] Sign in with Apple (waits for the Apple Developer account).

**Phase 4, room editor:** R3F scene to the design's look, gestures (orbit, pinch, drag with 5 cm grid, wall snap, rotate), bottom sheet (Ask / Add / Item / Finishes / Check), room check chip, walking-space overlay, undo/redo, versions, autosave, thumbnails from snapshots, and the real-device performance gate.

**Phase 5, AI designer:** Edge Function (agent loop on the shared engine, streamed), usage cap wiring, the Ask tab states (running, done, limit, nothing fits, offline), suggestion card, Restyle, Suggested next UI.

**Phase 6, capture:** LiDAR (`expo-roomplan`, verify the importer on a real export), guided ARKit scan (Swift module), failed-scan state, scan upload and `register_scan`. Needs the Apple Developer account and a LiDAR iPhone.

**Phase 7, Android:** Material components per the handoff, Galaxy A-class performance.

**Phase 8, launch:** share image, privacy policy and terms, in-app account deletion with storage cleanup, store listings, EAS Update channels, monitoring alerts, EAS Observe.

**Engine follow-ups (Phase 1b):** room-type rules from PRODUCT.md (sofa to coffee table, TV distance, dining chair pull-out, rug size, focal point). They need decisions: thresholds and weights the design doc does not give, and a screen size on TV units.

**Cross-cutting**
- [ ] Shrink the 28 legacy lint warnings to zero (clearance, placement, ops, validate, roomplan, summary).
- [ ] Measure the engine and 3D on a real phone (iPhone 11 class) and fix what misses the budget.
- [ ] Native-speaker review of every Arabic string we wrote ourselves.
- [ ] Decisions waiting for you: the dark gold button label (AA contrast) vs the prototype's plain gold, anonymous-account AI abuse, ghost button size (44 vs 40).

## My rooms (Phase 3.2)

Compared on the web build, English and Arabic, list and empty state (`COMPARE_GUEST=1 COMPARE_SEED=rooms npm run design:compare -- rooms en /rooms`; empty state: `rooms-empty` without the seed). All type, colour and spacing values match; what differs:

| Spec | Built | Why |
| --- | --- | --- |
| room pictures are 3D renders | plan drawings from above (`PlanView`) | our 3D renderer arrives in Phase 4; snapshots replace the drawings then |
| "Scan a room" label `#b68235` | `#7d5411` | AA contrast, as on Welcome |
| Arabic "Scan a room" in Cormorant with fallback glyphs | Amiri 700 | same prototype quirk as Welcome |
| way text starts at x 57 / 61 / 64 (numeral column shrinks to its digit) | all at 66 | the design's `width: 26px` numeral shrinks in a flex row; a fixed 26px column aligns cleanly |

**Honest caveats**
- **Rooms are saved on the device only** until sync is built (Phase 3.7). Deleting the app or switching phones loses them. Do not ship before sync.
- **Unreadable stored rooms are dropped and reported** to Sentry (the server copy comes back after sync exists).
- **The room screen is a placeholder** (name and plan) until the editor (Phase 4).
- "Edited …" labels count calendar days; beyond five weeks they read "Edited a while ago".
- `/capture` and `/settings` (the scan button and settings icon) are built in the next steps; until then they are dead ends.
- Arabic plural forms are covered for days 2–6 and weeks 2–4 only; check wording with a native speaker.

## Welcome and sign-in (Phase 3.1)

Compared with the prototype on the web build at 390×844, English and Arabic (`npm run design:compare -- welcome en /welcome`). Everything else the tool checks matches (fonts, sizes, weights, line heights, letter-spacing, colours, header and plate geometry). What still differs:

| Spec | Built | Why |
| --- | --- | --- |
| "Continue with Apple" button | not shown | Sign in with Apple is not configured (needs the Apple Developer account); the title and text sit ~50px lower because the plate is taller without it |
| "Try without an account" colour `#b68235` | `#7d5411` | plain gold fails WCAG AA as text (see Theme) |
| text buttons 40px tall | 44px | tap-target rule; the email button text sits 4px higher, the ghost 2px |
| title wraps "Scan a room. Arrange / it with confidence." (balanced) | greedy wrap, one line wider | CSS `text-wrap: balance` does not exist in React Native on iOS |
| Arabic buttons in Cormorant with browser-fallback Arabic glyphs | Amiri 700 | the design system says Arabic headings are Amiri; the prototype's button rule bypasses its own Arabic font variable |
| language pill 47px tall | 44px | each label is set in its own script (Naskh for العربية, Lora for English), which reproduces the design's tall pill; Naskh's metrics differ slightly |
| hero is a live 3D render | static PNG (`npm run hero`) | our own renderer arrives in Phase 4 |

Verified end to end on web against the local Supabase: "Try without an account" creates an anonymous user and its profile and lands on Rooms; signing out returns to Welcome. **Not verified:** the email code flow end to end (local mail is at http://127.0.0.1:54424), real-device safe areas, native RTL layout.

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

## Design compare and tests (Phase 0 step 6)

- **The compare runs on the web build** (react-native-web), so it approximates native: safe areas, native controls and real RTL layout still need a simulator or device pass. Pixel diffs are meaningless for 3D canvases; use the text-style report there.
- **Maestro flow is unverified.** `apps/mobile/.maestro/launch.yaml` has a placeholder `appId`; it needs a development build (Apple/Google accounts) to run. No emulator is set up here.
- **Metro's file watcher can miss edits** in this monorepo; restart the dev server with `-c` when the browser shows old code.
- **Node warns about the module type** when running `scripts/*.ts` (harmless).

## Engine (Phase 1)

- **Engine speed on a phone is unmeasured.** Desktop numbers: room check 2–4 ms (10 cm grid) and 7–9 ms (5 cm grid); Hermes is several times slower, so the 10 cm check may exceed one frame. Measure on a device (iPhone 11 class) in Phase 4 and, if needed, run the engine in the worklet runtime. `perf.test.ts` guards against regressions only.
- **Clearance distances are capped at 0.8 m** (nothing reads beyond it); results are identical on every test.
- `improveLayout` still only makes small moves (about 50 cm). Bigger changes come from the placement tools / AI.

## Backend (Phase 2)

- **Hosted Supabase project not created yet** (owner to-do). Everything runs against the local stack; local ports are shifted +100 (API 54421, DB 54422) because another project's Supabase uses the defaults. `supabase start` first, then `npm run test:db`.
- **Account deletion leaves files in storage.** `delete_account()` removes rows only. Removing scan files needs the Storage API with the service role, a new service-role call site, which `CLAUDE.md` says to ask about first. Decide in Phase 6, when scans exist.
- **Anonymous accounts can be farmed for AI requests** (each gets its own 20 a day). Options: limit AI to signed-in users, or rate-limit per device/IP in the Edge Function. Decide in Phase 5.
- **Apple sign-in is not configured** (needs the Apple Developer account); email one-time codes and anonymous sign-in are on locally. Email templates need Arabic text.
- **Scene validation in the database is shape and size only** (version, room corners 3–64, at most 300 objects, 256 KB). The engine and zod check the content in the app.
- **Autosaves are pruned to 50 per room**; saved, AI and restored versions are kept forever. Revisit if storage grows.
- **The AI cap resets at midnight Asia/Muscat** (`app_settings.ai_reset_tz`); change the setting for other markets.
- `register_scan` (insert a scan row after upload) arrives with the capture work in Phase 6.

## Weakened checks (debt)

- **Legacy size/complexity limits.** 28 warnings in `packages/core` (`importers/roomplan`, `layout/{clearance,placement,validate}`, `ops`, `summary`, two test files). `npm run lint` caps warnings at 28 so the count can only fall. Refactor these in Phase 1 (they are being changed anyway), then shrink `LEGACY` in `eslint.config.js` and the cap in `package.json`.
- **knip can't flag unused exports in `packages/core`** because every file is an entry point. Add `packages/core/src/index.ts` as the public API and make it the only entry.
- **`web/` is frozen** and excluded from lint, dead-code and duplicate checks. Only its tests and typecheck run.

## Unverified

- RoomPlan importer: tested on a synthetic scan only, not a real device export.
- AI agent loop: tested against a fake model client, never run against the live API.
- Parent folder `buildit/` still has copies of `CLAUDE.md`, `AGENTS.md`, `STACK.md`, `design-docnew/`; the repo copies in `app/` are the real ones. Delete the originals.
