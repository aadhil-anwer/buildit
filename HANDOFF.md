# Handoff (stopped 2026-10-12, at the end of Phase 3)

Read this first, then `CLAUDE.md` (working rules), `STACK.md`, `OPEN_ISSUES.md` (owner to-do list and everything unverified), and the plan at `~/.claude/plans/stateful-napping-aurora.md` if it exists (the phases are also in `OPEN_ISSUES.md` under "Pending work").

## Where things stand

Branch `claude/jolly-bell-hhwtu2`, all pushed, CI green. `npm run verify` and `npm run test:db` pass.

**Done and verified**
- **Phase 0** foundations: monorepo (`packages/core`, `apps/mobile`, `web/` frozen, `supabase/`), quality gates (lint size/complexity, duplicates, dead code, capped legacy warnings), theme tokens generated from the design system, fonts, EN/AR strings generated from the prototype, typed `t()`, RTL, error reporting (`report()`, Sentry wired but needs a DSN), `design:compare` tool.
- **Phase 1** engine: room check and score, `largestFree`, time-sliced optimizer, restyle, suggestions, `adjustWallLength`, perf guards.
- **Phase 2** backend: schema, forced RLS, column grants, functions (`create_room`, `save_version`, `restore_version`, `consume_ai_request`, `ai_usage_today`, `delete_account`), 60 pgTAP assertions.
- **Phase 3** entry screens, all compared with the prototype in EN and AR (`design:compare`): Welcome, email sign-in, My rooms, Capture chooser, Type dimensions, Scan review, Settings, a placeholder room screen, and **local-first sync** (`src/sync`). Verified end to end on the web build against the local Supabase: email code sign-in, create a room in the UI, it reaches the database, a second fresh browser sees it.

## Resume here (in order)

1. **Phase 3 leftovers:** Sign in with Apple (needs the owner's Apple Developer account; the button is hidden until configured). Room deletion UI (not designed). The guest-to-email upgrade is built (Settings > Add an email) but only unit-tested; try it against local Supabase.
2. **Phase 4: the room editor**, the heart of the app. R3F native scene to the design's look, gestures (orbit, pinch, drag with 5 cm grid and wall snap, rotate), the bottom sheet (Ask / Add / Item / Finishes / Check) as one shared `Sheet` primitive (replace the plain modals in the wall stepper and dialogs), room check chip, walking-space overlay, undo/redo, versions, thumbnails from snapshots (replace `PlanView` thumbnails), and the on-device performance gate (STACK.md budgets are unmeasured on Hermes). `src/screens/editor.tsx` is a placeholder to replace.
3. Phase 5 AI designer (Edge Function on `packages/core`), Phase 6 capture (needs Apple account and a LiDAR iPhone), Phase 7 Android, Phase 8 launch. Details in `OPEN_ISSUES.md`.

## Things to know

- **Commits:** author is the owner (repo-local git config); never mention Claude/AI in commits or PRs; stage exact paths and check `git status` for untracked files before pushing (a missed new file broke CI once); push the branch at least daily; watch CI (`gh run watch`).
- **Run locally:** `npx supabase start` (ports are shifted +100: API 54421, DB 54422, mail 54424, because another project uses the defaults), copy `apps/mobile/.env.example` to `.env.local` with values from `npx supabase status`, then `npm run web` in `apps/mobile`.
- **Design compare:** `npm run design:compare -- <screen> en|ar <route>` (see CLAUDE.md; `COMPARE_GUEST=1 COMPARE_SEED=rooms` for screens behind the login). Stop the dev server before `npm run verify`; a running Metro server slows jest to a crawl and causes timeouts. After editing, restart the web server with a cleared cache (`npx expo start --web -c`); its file watcher misses edits.
- **Email sign-in needs the code template.** Supabase's default email has no code. `supabase/templates/code.html` and `config.toml` fix it locally and `tools/email-templates.test.ts` guards it. The hosted project must get the same template (dashboard or `supabase config push`).
- **Test pitfalls hit so far:** React Native Testing Library 14 is async (`await render`, `await fireEvent`); import Lucide icons one by one (`lucide-react-native/icons/<name>`; the barrel made cold test runs take 13 minutes); `useFail()` sends async errors to the error boundary; avoid `head` after `npm run verify` in a pipe (it kills npm).
- **Known intended differences from the prototype** (all listed in `OPEN_ISSUES.md`): button labels use the darker gold for AA contrast, 44pt tap targets, plan drawings instead of 3D thumbnails, Amiri in Arabic buttons.
- **Sync** (`src/sync`): push dirty rooms (`create_room` / `save_version` / rename), then pull; local unsent edits win and nothing is lost because every save is a new server version; a different account signing in on the same phone starts with no rooms; failures show "Couldn't sync" on My rooms and retry after 30 s.

## Owner to-do (blocking later phases)

See the top of `OPEN_ISSUES.md`: Sentry DSN, Expo account, hosted Supabase project, Anthropic key, Apple Developer account, iPhone model, final app name and legal pages.
