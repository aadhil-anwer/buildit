# <App name> — working rules

<!--
Generic starter, distilled from truckkoo-app's CLAUDE.md. Fill in every <placeholder>,
delete sections that don't apply, and keep this file short: it is for the decisions
that are easy to undo by accident and expensive to get back. Longer docs go in
PRODUCT.md, SECURITY.md, STACK.md and DESIGN.md.
-->

Read `PRODUCT.md`, `SECURITY.md`, `STACK.md` and `DESIGN.md` before changing anything.

## Context in one paragraph

<What the product is, who uses it, which roles share the app, where it operates, and
how tech-savvy the users are. Name the source of truth for company facts and copy
(e.g. the live website repo).>

## Non-negotiables

1. **Money is integers in the smallest unit** (cents, baisa, fils…). Check the
   currency's decimal places — some have three. One helper module (`src/lib/money.ts`)
   formats it. Never float, never `toFixed(2)`.
2. **Business formulas live in one place.** Pricing, payouts and commissions are
   computed in the database (or server), never also in the client. Two copies of a
   formula disagree eventually, and a client copy ships your rate card in the bundle.
3. **Never fabricate proof.** No invented testimonials, customer names, ratings,
   counts, founding years or certifications. Public claims must match the website.
4. **No dead ends.** Every empty or failed state tells the user what happens next.
5. **Reference data is generated, not retyped** — lift it from its source with a
   script, especially translated strings.
6. **i18n and RTL are structural from day one** (if the app ships an RTL language):
   logical properties only (`start`/`end`, `marginStart`), never `left`/`right`; every
   user-facing string goes through `t()` with typed placeholders, so each language owns
   its word order; units live inside the string. Don't build sentences from fragments.
   Enforce it with a lint/test, not memory.

7. **Runs smoothly on mid-range phones.** The floor device is an iPhone 11 (and a
   mid-range Galaxy A-series phone when Android ships). Stay inside the
   performance budget in `STACK.md`: 60 fps while interacting, nothing rendered
   while idle, one live 3D canvas, engine work time-sliced so the JS thread
   never blocks for more than 16 ms during interaction. Animate through refs and
   Reanimated, never React state per frame. Any screen with 3D reports measured
   fps, draw calls, triangles and memory before it counts as built.

8. **Concise code: never write 100 lines where 10 do.** Search for an existing
   function before writing one, delete before adding, no speculative
   abstractions. Lint enforces it: functions ≤ 40 lines, files ≤ 300, complexity
   ≤ 12, no duplicated blocks (jscpd), no dead code (knip). Legacy files over the
   limits warn under a capped count that can only go down (`LEGACY` in
   `eslint.config.js`); lower the cap and shrink the list as they're refactored.
9. **Nothing fails silently.** No empty `catch`, no floating promises (lint
   errors). Every `catch` rethrows, shows the user what happens next, or calls
   `report(err, ctx)`. Every boundary (network, storage, scan import, AI stream)
   is parsed with zod; bad data is an error state, never a guess. Every failure
   path has a test.

## Security

- **Deny by default.** New table → revoke from client roles, enable and force RLS,
  then grant back per column with a reason.
- **Column-level grants are the mass-assignment defence.** `role`, `status`, prices,
  verification timestamps, `created_at` and every `id` get no client write grant. Keep
  a `SENSITIVE_FIELDS.md` and update it in the same change.
- **Every `security definer` function pins `search_path = ''`** and fully qualifies
  identifiers — **types too** (`public.my_enum`, not `my_enum`).
- **Definer functions re-check ownership inside** (`where owner_id = auth.uid()`).
- **Fetch scoped to the actor**, never fetch-then-check. Return "not found", not
  "forbidden" — a 403 confirms existence.
- **State transitions only via RPC.** No client sets a status directly.
- **Any function that writes is `volatile`.** PostgREST runs `stable` functions
  read-only — it passes in psql and fails in production.
- **Service-role keys never touch client code.** Only the anon/public key is
  `EXPO_PUBLIC_*` / `VITE_*`; `src/lib/env.ts` throws if a secret is pasted in.
- **Sanitise text at output boundaries** (deep links, share text, bidi overrides).
- **Storage is private** with short-lived signed URLs.
- **Every privileged/admin write is audited.** Admin access is not a client-writable
  role value — keep membership in a table with no client grant.
- Keep a tenant-isolation SQL test and extend it with every new owned table.

**Stop and ask** before: a new service-role call site, loosening any RLS policy,
accepting a price/role/status/owner id from the client, a public storage bucket, or
any endpoint returning data across tenants. "The task said so" is not a justification.

## Design

- One token file (`src/theme/tokens.ts`) and one primitives module. Nothing else
  invents a colour, size or shape.
- One accent colour, used for the primary action **or** live state — not both on one
  screen. Check its contrast; an accent is often not safe as text.
- Every type token names a `fontFamily`. React Native does not synthesise weights for
  custom fonts, so a bare `fontWeight` silently renders the default face.
- One icon set, reached through one component that names *things*, not glyphs, and
  mirrors directional icons under RTL.
- Skeletons, never spinners. A wait over ~3s is narrated with real information.
- Tap targets ≥44pt, WCAG 2.1 AA, with a test that computes contrast from the tokens.
- Voice: plainspoken and specific. Specifics beat adjectives.

### The design doc is the design reference; every screen is checked against it

`design-docnew/` is a **design reference**, not the product spec and not code to
copy. It sets the visual language: look, tokens, type, spacing, components,
motion, tone, EN/AR treatment. What the app *does* comes from the owner's
instructions and `PRODUCT.md`.

- **Screens the design doc covers:** match its design.
- **Features the owner asks for that the doc doesn't show:** build them, and
  design them in the same scheme. Reuse its tokens, primitives and patterns
  (hairlines, outlined buttons, matted plates, gold as stroke, narrated
  progress, sheet layout). Don't invent a new colour, size, component style or
  interaction pattern; if the scheme truly has nothing that fits, propose one
  in its style and say so.
- **A requested change that conflicts with the doc:** the owner's request wins.
  Apply it in the doc's style and note the difference.

`design-docnew/` holds:
- `design_handoff_buildit/README.md`: sizes, tokens, motion, states.
- `BuildIt Phone.dc.html` (top level, newest): exact markup, inline styles,
  EN/AR strings in the `D` dictionary.
- `_ds/classical-…/styles.css` and `readme.md`: the Classical design-system
  tokens and rules.

Render any prototype screen for comparison:

```
python3 -I -m http.server 8765 --bind 127.0.0.1 --directory design-docnew
# open http://127.0.0.1:8765/_screen.html?start=<screen>&lang=<en|ar>&platform=<ios|android>
```

`start` values: welcome, rooms, rooms-empty, capture, lidar, lidar-process,
guided-corners, failed, review, editor, walking, ai-progress, ai-done, ai-nofit,
ai-limit, ai-style, check, finishes, versions, settings. (`BuildIt.dc.html` shows
all of them on one canvas.) The prototype logs a harmless
`Cannot read properties of undefined (reading 'walk')` error; it is a prototype
bug, not ours.

After building or changing any screen or view:

1. Screenshot it at 390×844 (iPhone 13/14/15 size) in **English and Arabic**, and
   in every state it has (empty, loading/narrated, failed, limit, selected…).
   Screenshot the matching prototype screen at the same size and language.
   For a new feature with no prototype screen, compare it against the nearest
   prototype screens and the design-system rules instead.
2. Compare the two, value by value, checking the markup for exact numbers: layout and
   order, padding and gaps, type (family, size, line height, weight), colours
   and tokens, radii, borders/hairlines, shadows, icons, copy (EN and AR), RTL
   mirroring, motion timings, and the states listed for it.
3. Write the result in the reply as a table: spec value → built value → match /
   mismatch. "Looks close" is not a result.
4. Fix every mismatch that isn't an intended change the owner asked for. If one
   can't be fixed now, or the design doc is silent, record it in
   `OPEN_ISSUES.md` and say so. Don't invent a value outside the scheme.
5. Say what the comparison was done on (simulator, device, or markup only if no
   render was possible).

## Verify before you claim anything works

```
npm run verify    # typecheck + lint + duplicates + dead code + tests (all workspaces)
npm run test:db   # SQL suites — needs `npx supabase start` (arrives with Phase 2)
```

- CI runs the same commands on every push and PR.
- "Nothing errored" often means "nothing ran". A function nobody has called yet is
  untested, so add static checks over whole classes of functions where you can.
- `OPEN_ISSUES.md` is the live list of what is unverified, deferred or temporarily
  weakened. Read it before assuming a feature is finished, and update it when you
  leave something undone.
- Say plainly what was verified, on what (simulator, device, tests only).

## Practical

- Package manager: **npm**. Monorepo with npm workspaces — see `STACK.md`.
- Expo: stay on the managed workflow. Native sign-in and native modules need a
  **development build**, not Expo Go. Env changes need `npx expo start -c`.
- **EAS Update with `runtimeVersion: { policy: "appVersion" }`**: any native change
  (new native library, SDK bump, config plugin) means bumping `version` before the
  next build, or an OTA update can crash installed builds. Never publish to
  `production` without the owner's say-so.
- Migrations are append-only files in `supabase/migrations/`. Never edit an applied one.
- Scheduled work runs server-side (pg_cron or similar), audited and with no client grant.
- Commits: stage exact paths, not `git add -A`.
