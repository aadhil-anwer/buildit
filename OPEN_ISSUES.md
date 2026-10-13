# Open issues

> **Handoff:** work stopped at the end of Phase 3 on 2026-10-12. Start with `HANDOFF.md`.

## Owner to-do (things only you can do)

Tick them off here. "Needed by" is the phase that gets blocked without it.

- [ ] **Sentry account** + a project for the app and one for the Edge Function; send me the DSNs, never the auth token in chat. Needed by: Phase 0 step 3 (now).
- [ ] **Expo account** + `npx eas-cli login` and `eas init` (type `! eas login` here). Needed by: Phase 0 step 3.
- [ ] **Supabase project** (free tier is fine to start): project URL, anon key, and a service-role key kept only in Supabase secrets. Needed by: Phase 2.
- [ ] **Anthropic API key** for the AI designer (server-side secret only). Needed by: Phase 5.
- [ ] **Apple Developer account** ($99/year, takes a day or two to approve). Needed by: Phase 4 on-device testing, required for Phase 6 and the App Store.
- [x] **iPhone model: base iPhone 13, no LiDAR** (answered). LiDAR room scanning (RoomPlan) cannot be tried on it; the guided ARKit scan and typed dimensions can. LiDAR needs a 12 Pro / 13 Pro or later (or a Pro iPad) to test, or ship it unverified. Decision needed before Phase 6: which phone tests LiDAR?
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
- [x] Capture chooser, Type dimensions, Scan review (plan view, ±5 cm wall steppers, furniture list) built.
- [x] Settings (language, walkway 90/75, AI usage, sign out, delete account) built and compared.
- [x] Local-first rooms with sync to Supabase, and clear failed-sync state built (see Sync).
- [ ] Sign in with Apple (waits for the Apple Developer account).

**Phase 4, room editor:** R3F scene to the design's look, gestures (orbit, pinch, drag with 5 cm grid, wall snap, rotate), bottom sheet (Ask / Add / Item / Finishes / Check), room check chip, walking-space overlay, undo/redo, versions, autosave, thumbnails from snapshots, and the real-device performance gate.

**Phase 5, AI designer, backend built, no real model yet.** Done and verified: tools (intents only, audited by a test), the loop (engine before/after, revert on new errors, replies with unmeasured numbers dropped), 121 scripted evaluation scenarios, the request handler (bad request refused uncounted, size limit, cap, guest 403, signed-out 401, limit 429 with reset time), the Claude Messages API adapter (fixtures only), and `supabase/functions/agent` served in the local edge runtime against the local database: guest got 403 `email_required`, a bad request got 400 and was not counted, a good request was counted once and streamed SSE (ending in `model_failed` because there is no key and no network), and the next request got 429 with `resetsAt`. **Not verified:** any real model call. Quality, latency, tokens and cost per request, prompt wording, refusal handling and the model id (`AGENT_MODEL`, default `claude-sonnet-5-5`, cheaper than the old web agent's opus) all wait for the Anthropic key. The scripted evaluation proves the guarantees hold whatever the model asks for; it does not measure how good the model's choices are. **Weaknesses to decide:** (1) a request that fails after being counted (model unreachable) still costs one of the 20; refunding needs a service-role function (ask first) or charging only on success (allows a burst past the cap); (2) the function enables CORS for any origin (the app is native; tighten before launch); (3) `core.js` is built by `npm run agent:bundle` (runs in `verify`) and is not committed, so deploying needs that step first; (4) the local edge runtime here could not download npm packages (the sandbox's TLS interception), so the function uses plain `fetch` for the database call instead of supabase-js. **Ask tab built and checked end to end with a stand-in model.** In a real browser: sign in with an email account, type a request, the app calls the real Edge Function (local edge runtime), which counts it in the real database, runs the real tools and engine against a fake Anthropic server (`ANTHROPIC_API_URL`, a ~20 line node script in the HANDOFF recipe) that asks for a restyle; the card then shows the answer, "What changed" (worded by the app in the person's language from the two rooms, not from the model), and Keep / Undo / Show another option. Unit-tested: SSE parsing (split chunks, bad scenes, unknown events), the client's refusals, the state machine (steps previewed, result applied as one undoable change, reverted/unchanged, limit, guest, offline, failure mid-stream, second request ignored, Keep saves a named version, Undo, another option with `avoid`, conversation history), and every Ask card. **Not done:** (1) no real model: wording, tool choices, latency and cost are unknown; (2) the prototype's progress bar is not shown (the stream has no percentage; steps appear as lines); (3) the special "a table for six won't fit" card is not built: a request that cannot be done ends as "Nothing needed to change" with the designer's own words when they pass the number check (a purpose-built nofit card with the largest free area and an Add button is still open); (4) the "Measured" rows only list facts that changed, so a recolour shows none; (5) Arabic and English Ask states (idle with the usage line and suggestion card, running, done) were screenshotted at 390x844 on the web build against the local function and the stand-in model: RTL mirroring, tab order, usage line ("تبقّى ٢٠ من ٢٠ طلبًا اليوم"), the "What changed" rows and Keep / Undo / another-option layout look right. They could **not** be pixel-compared with the prototype, because the prototype's ai-progress and ai-done screens render only its idle sheet in headless Chromium (the known prototype bug); the limit and won't-fit cards are unit-tested only, not screenshotted. The stand-in model answered in English inside the Arabic screen; the real prompt tells the model to reply in the person's language, which is unverified until a real model runs; (6) a guest sees the "needs an email" card without a request box and without the quick asks; (7) the usage line re-reads the server after each request. Original plan list: Edge Function (agent loop on the shared engine, streamed), usage cap wiring, the Ask tab states (running, done, limit, nothing fits, offline), suggestion card, Restyle, Suggested next UI.

**Phase 6, capture:** LiDAR (`expo-roomplan`, verify the importer on a real export), guided ARKit scan (Swift module), failed-scan state, scan upload and `register_scan`. Needs the Apple Developer account and a LiDAR iPhone.

**Phase 7, Android:** Material components per the handoff, Galaxy A-class performance.

**Phase 8, launch:** share image, privacy policy and terms, in-app account deletion with storage cleanup, store listings, EAS Update channels, monitoring alerts, EAS Observe.

**Engine follow-ups (Phase 1b), started:** `designTips` (`packages/core/src/rules/design-tips.ts`) measures four advisory rules: sofa to coffee table (30-55 cm, ideal 35-45), TV distance (1.5-2.5 x the screen diagonal; TV units now carry 55/65 inch), seats facing each other within 3.0 m, sofa front legs on the rug. They show as "Design tips" in the Check pane and are handed to the AI with their measured numbers and sources. **They do not change the score and the thresholds are unreviewed rules of thumb, not standards: the owner (ideally with an interior designer) must review `DESIGN_RULES` before they count.** Still to do: dining chair pull-out (75-90 cm), bed foot/headboard, focal point and walkway through the seating group, desk and window glare, balance, colour 60-30-10, GCC rules (majlis, door privacy, orientation customs: need a local reviewer), weights for the score, tips wired into `improve`. The Arabic tip sentences are unreviewed.

**Cross-cutting**
- [ ] Shrink the 28 legacy lint warnings to zero (clearance, placement, ops, validate, roomplan, summary).
- [ ] Measure the engine and 3D on a real phone (iPhone 11 class) and fix what misses the budget.
- [ ] Native-speaker review of every Arabic string we wrote ourselves.
- [x] Decisions on the gold label, anonymous AI abuse and ghost size are answered (see Editor > Owner decisions).

## Future plan (after the MVP; owner said "add to future plan")

- **DIY and repairs (plan approved in principle, not started).** Tiers: green (paint, small patch, caulk, shelves, flooring) gets full guides; yellow (tiling, carpentry, shed from a kit) gets guides with stop points and "check local rules"; red (mains electrical, gas, load-bearing, roofing at height) never gets steps, only "hire a licensed pro". Order: (1) materials and shopping list from the room's own measurements (paint litres, flooring boxes, tiles; pure engine maths with sourced coverage/waste table), (2) 15 to 20 green guides reviewed by a qualified tradesperson, EN and AR, the AI only routes to a guide and fills in quantities, (3) shed planner as a separate "yard" scene with clearance checks and a cut list, no country legal claims. Needs: a reviewer, a lawyer's look at liability wording, and evidence from about 20 users on which jobs they want.
- **Selling:** per-room one-time pass first (about $19 to $29 local price), subscription only if many buy a second room within about 60 days; a website and web checkout (the app can't point to it outside the US storefront under Apple 3.1.1(a); Google's policy page could not be read here, check it); the free taste is the Room Check diagnosis plus one redesign and one watermarked render. Saudi Arabia first, then UAE. All figures are unverified estimates.
- **Photoreal render**, **richer 3D furniture**, **designer review tier**: see Premium feel and Design quality above.

## Premium feel (owner asked for a $500M-product feel)

Plan: `~/.claude/plans/how-do-we-plan-enumerated-wozniak.md` (A furniture, B haptics, C motion, D first-run coach, E honest trust, F device gate).
- [x] A (started): softer, more detailed furniture (rounded cushions, sofa seat and back cushions, bed duvet), same part cap (8) so draw calls stay in budget. Looked at in a browser on the bedroom only; not compared per piece, not measured again for draw calls on a device.
- [x] While the AI designer works, the 3D room shows a gold scan band sweeping the floor, pieces glide to their new places as each step arrives, and pieces it has changed so far are outlined. Driven by the real steps (not a canned animation); turns off with the phone's Reduce Motion setting. **Not yet seen running**: my local function/stand-in model setup fell over while I tried to screenshot it, so this is unit-tested (which pieces count as changed) and type-checked only. Frame rate during the animation on a phone is unmeasured.
- [ ] B haptics (none exist yet; the earlier note that the sheet and suggestion card use them was wrong), C motion tokens and screen transitions, D first-run coach, E "Why" sheet on tips, F iPhone 13 run.
- [ ] **Photoreal mood render (owner said yes; "very realistic").** Blocked on owner: (1) which image provider (Anthropic has no image generator; options are an OpenAI, Google or similar image model), (2) its API key as a server secret, (3) cost per image and a daily cap separate from the 20 AI requests. Constraints I will hold to: shown only as a labelled "illustration, sizes may differ", never as the plan of record; layout and measurements stay the engine's; the image is generated from the 3D room's own snapshot plus the engine's list of pieces (so furniture matches) but an image model cannot guarantee exact sizes or placement; a new Edge Function means a new external call site, checked with you first. Not started.

## Design quality: the road to "interior-designer level" (honest status)

Today the engine has 9 advisory design rules (`DESIGN_RULES`: coffee-table gap, TV distance, conversation distance, rug under sofa, dining chair pull-out, bed foot, headboard under a window, nightstand pair, desk and window glare) plus the room check (walkway, doors, bed sides, storage reach, window light). They are commonly cited rules of thumb, **not reviewed by a designer**, and they show as tips and nudge `improve` (0.4 cost per unmet rule, far below a blocked door); they are not in the room-check score. This is a good checker, not a replacement for a designer. To get closer:
- [ ] A designer (ideally one who knows GCC homes) reviews every threshold in `DESIGN_RULES` and the Arabic tip strings. Owner to arrange.
- [x] Tips feed `improve`'s cost. [ ] Still not in the room-check score; decide after designer review of the thresholds.
- [ ] More rules: focal point (seating faces a TV/window/feature wall), wardrobe/door clash, 60-30-10 colour split, balance and symmetry, majlis layout and door-sightline privacy (needs a local reviewer).
- [ ] Run the evals against the real model (needs the Anthropic key) and have a designer score about 20 outputs against a plain chatbot's answers on the same rooms.
- [ ] Scan accuracy (LiDAR) bounds everything above; unverified until a LiDAR device is tested.
- [ ] Users expect photoreal pictures; a 3D room will look plainer. Optional "mood render" is an owner decision, not planned.

## Editor (Phase 4, in progress)

**Built:** wall snap (a dragged piece within 8 cm of a wall jumps flush; the drag preview does not show the snap, the landing does; unit-tested, not tried by hand), suggestion card (appears 2.6 s after the room is left alone, 6 s after a dismissal; Try it applies the change as one undoable step), door swings, walking-space overlay (walk button and the "Check the walking space" suggestion; gold where a person can walk, rust where it is too tight, from the engine's clearance grid; checked in the browser in 3D and plan, not compared with the prototype); `Sheet` (196 / 404 / 640 pt, drag or tap the grabber, Reanimated height) with the Ask / Add / Item / Finishes tabs and the Check pane; header (back, room name, undo, redo, versions); room-check chip; 3D view (React Three Fiber, orthographic 33 degree view, hidden camera-facing walls, tap to select, drag a piece in 5 cm steps, drag floor to orbit, pinch to zoom); Plan view (tap, drag, same 5 cm steps); every change is one undoable step (50 deep) saved to the room at once; Fix (time-sliced layout improver); restyle; versions (save, list, restore) on this phone.

**What was checked, and on what**
- 424 unit tests (`npm run verify` green), including the engine ops the editor calls, history, picking and drag maths, wall cut-outs, furniture parts, versions and every pane.
- Web build in Chromium with **software GL** against the local Supabase: Editor EN and AR, Check, Finishes, Item, Versions compared with the prototype (type, positions, colours match except the notes below); tap, orbit and drag driven with the mouse and seen working.
- 3D stats on that browser (bedroom, `globalThis.__builditPerf`, development builds only): **16 draw calls, 3,062 triangles, 9 geometries, 3 textures**. Budgets: 150 / 150k / 32 MB.
- **Nothing has run on iOS or Android, in the simulator or on a phone.** The frame rate, JS-thread blocking, memory, thermal behaviour, expo-gl, real touch (pinch has not even been tried with a mouse) and the sheet's drag and glide are all unmeasured. The 60 fps gate in STACK.md is **not met by evidence**, so Phase 4 is not done until it runs on an iPhone 11 class phone.
- 3D cannot be compared pixel by pixel with the prototype: the prototype's own 3D draws nothing in headless Chromium. The look (lights, tone mapping, camera angle) follows `room3d.js`; furniture shapes, floor and wall colours are not matched side by side.

**Not built yet (each one is a visible gap or a missing control)**
- Wall-length labels on the walls in 3D and the plan (the dimension pills the prototype shows); rotating a piece by gesture (Item pane turns 90 degrees only).
- Plank floor and contact-shadow PNG assets (the floor is one flat colour), window frames. (Door swings are drawn in 3D and the plan: hinged at the start of the opening, always opening into the room; the engine's door rule does not say which side a door hinges on.)
- Quality tiers from the device (`expo-device` was dropped until then) and dropping to the low tier when frames are slow. (The canvas already stops drawing when the editor is not in front or the app is in the background; unit-tested only.)
- Header **Share** button (Phase 8: needs the GL snapshot and the share sheet). Room thumbnails are still plan drawings, not 3D snapshots.
- Ask tab: the request box, "N of 20 requests left" and the four ask chips wait for the AI designer (Phase 5). The tab shows Suggested next and Restyle, which work without it.
- Undo history lives in memory: closing the editor starts a new one (the room itself is saved).
- Sheet size changes re-fit the room instantly; they do not glide with the sheet.
- The suggestion card's wording is the design's; its rug suggestion now offers a 220 x 150 cm rug (added to the catalog) so the sentence is true.
- Android: Material controls (Phase 7). The sheet already uses 28 pt corners there (not seen).

**Known differences from the prototype**
- Pane headings use Cormorant 400 where the prototype asks for 500 (500 is not loaded; weights are one file each).
- Fix and Restore buttons are 44 pt tall (prototype 34 and 30), for the tap-target rule.
- The room-check chip's second line is Lora; the prototype leaves it in the browser's default Arial (a button that did not inherit the font).
- Arabic tab labels sit about 5 px higher than the prototype's.
- Add tab sizes come from the engine's catalog (rug 230 x 160, coffee table 120 x 60, bookshelf 90 x 35) and differ slightly from the prototype's hard-coded ones.
- Versions: the top row is always the room as it is now ("Where you are now", tagged Current); saved versions follow with Restore. The prototype tags the latest saved one Current instead.
- Undo and redo icons are mirrored under RTL; the prototype does not mirror them.

**Wrong or weak, to fix**
- Fix now searches for at most 300 ms, the STACK.md budget, in 8 ms slices. On a laptop a room it cannot fix uses the whole budget and does not improve at 150 to 1500 ms, so the budget is not what limits it; a fixable room has not been tried on a phone.
- `design:compare` needs `CHROMIUM_PATH` and `UNPKG_DIR` in this cloud container (see HANDOFF.md).

**Native changes in this phase (new development build needed, never publish to `production` without the owner's say-so):** Reanimated, worklets, gesture handler, expo-gl and expo-asset / expo-file-system (peers of React Three Fiber). `app.json` version is **1.2.0**; an OTA update cannot reach older builds.

**Owner decisions (answered 2026-10-12)**
1. Saved versions **sync to the server** (as `manual` versions with their label). **Built** (see Sync).
2. Versions top row stays "Where you are now" (differs from the prototype, accepted).
3. Check sentences **follow the walkway setting** (75 or 90 cm), new copy in both languages. **Built** (the walkway sentence uses the room's own width; the other rules stay at 60 cm).
4. Undo and redo stay mirrored under RTL.
5. Header Share stays hidden until Phase 8.
6. Button labels keep the darker gold (AA); ghost buttons stay 44 pt tall.
7. **AI designer requires an email**: guests can design by hand but must add an email to use AI (`consume_ai_request` now refuses an anonymous login with "email required", pgTAP-tested). **Still to do (Phase 5):** the Ask tab must say so and point a guest to "Add an email", and the Edge Function must treat that error that way.
8. **Room deletion**: long-press a room card, confirm dialog, deletes on the server too. **Built** (see Sync). A one-line hint under the room count now says "Press and hold a room to delete it" until the first room is opened or a delete is started (not in the prototype, not screenshotted; Arabic unreviewed). The editor says once, on first open, "Drag a piece to move it. Drag the floor to turn the room." (same status).
9. Performance gate device: **iPhone 13** (newer than the iPhone 11 floor, so it flatters the numbers; mark results "iPhone 13, not floor device" until an iPhone 11 class phone is tried).
10. Merge to the main branch **after the on-device perf check**; keep pushing the branch daily; never merge without the owner.
11. Arabic strings written by us ship without native review for now (still flagged below).

## Sync (Phase 3.7)

Verified end to end on web against the local stack (email code sign-in, a room created in the UI appears in `rooms` and `room_versions`, a second fresh browser on the same account lists it). Unit-tested: push, pull, conflicts, edits during a sync, rooms deleted elsewhere, unreadable server data, account switch, walkway preference, debounce, retry, foreground.

Caveats:
- **Sign-in email now carries the code** (`supabase/templates/code.html`); the hosted Supabase project needs the same template, and the email is bilingual (EN and AR, unreviewed).
- **Room deletion** is built without a design: long-press a room card, confirm, then `delete_room` on the server (new migration, pgTAP-tested; a room the server already lost counts as deleted). A queued delete survives restarts (`deleted` in the rooms store) and is dropped on an account switch.
- **Saved versions sync**: sent oldest first as `manual` versions with their name, then the latest scene is saved again as current so the room never goes back to an older scene; pulled from the server by id, newest 30 kept per room. Checked against the local Supabase by hand (a saved version reached `room_versions`; a deleted room stayed deleted). Unit-tested with a fake server. Not tried: two phones at once. The server also holds each room's first version as an unnamed `manual` row (from `create_room`); the pull ignores unnamed ones.
- **A different account signing in on the same phone wipes the local rooms** (the previous account's rooms live on the server). Unsynced edits from the first account would be lost; sync runs after every change so the window is small.
- **Sync runs every 2 s after a change and retries every 30 s after a failure**; no exponential backoff yet. Offline failures are not sent to Sentry, other failures are.
- Native (iOS/Android) behaviour of the app-state listener and offline detection is untested on a device.
- Fixed while building this: the database test for account deletion counted all rooms (now scoped), and the `tools` tsconfig has Node types.

## Settings (Phase 3.6)

Compared on the web build (English and Arabic, guest account). Type, colours, spacing and structure match. Differences:

| Spec | Built | Why |
| --- | --- | --- |
| "noor@example.com", "3 of 20 used" | "Guest account (no email)", "0 of 20 used" | real data from the guest account and the server |
| Arabic buttons in Cormorant with fallback glyphs | Amiri 700 | same prototype quirk as Welcome |
| language pill 47px, Arabic label bold | pill built from the face's natural height; label semibold | the design's height comes from the browser's fallback Arabic font; ours from Noto Naskh |
| small vertical offsets (about 6px) in the sections | | the pill's height difference carries down the page |

**Behaviour and caveats**
- **Walkway preference is saved on the device only** (not yet in the `profiles` table) and is applied to **new** rooms. Existing rooms keep theirs; the editor will apply the preference when it runs the room check (Phase 4). Server sync comes with sync (Phase 3.7).
- **AI usage** is read with the new read-only `ai_usage_today()` function (migration `20261013000000`), so looking at it never uses a request. If it cannot load, the screen says so and the failure is reported.
- **Signing out keeps this device's rooms** (they have not been synced anywhere yet). Decide with sync: sign out on a shared phone should not leave someone's rooms behind, but clearing them now would lose unsynced work.
- **Guest sign-out asks first** because a guest account cannot be signed back into. A guest can add an email from Settings (`updateUser` + `verifyOtp` type `email_change`, same account so rooms stay). Unverified against a running Supabase: only unit-tested. The hosted project needs the `email_change` code template too. An email that already has an account is refused with a message; merging a guest's rooms into that account is not built.
- **Delete account** removes the account and all server data and wipes this device; it does **not** remove files in storage (see Backend).
- **Arabic to review:** guest warning, usage and delete messages, guest upgrade strings.

## Capture, dimensions and review (Phase 3.3 to 3.5)

**Capture chooser** (compared structurally; the LiDAR-detected variant cannot be compared until Phase 6): offers only methods this build can run. Today that is typing dimensions, shown as the recommended card with the note "Scanning isn't available yet" (`capSubNoScan`). LiDAR and guided appear automatically when `captureSupport()` (src/capture/support.ts) reports them; replace that note with the design's "LiDAR detected" and a no-LiDAR variant in Phase 6.

**Type dimensions** has no prototype screen; built in the same scheme (text fields, chips for walls). Name, width, length, ceiling height, door wall, optional window wall. Limits: sizes 1.5 to 12 m, height 2 to 4 m. Decimal comma and Arabic digits are accepted. Not yet: L-shaped rooms (the engine supports them; the form makes rectangles), several doors or windows, choosing where on the wall they sit (the door is 30 cm from the wall's start corner, the window centred) until the editor's item tools.

**Scan review** matches the prototype's heading, hint, furniture list and "Looks right" bar. Differences:
- the plan is a top-down drawing with the wall lengths around it; the prototype shows them on its 3D view, so positions cannot match;
- the wall stepper uses a plain modal until the shared bottom Sheet exists (Phase 4); its Done button is 46px tall (design 48);
- the furniture list shows each piece's type name (Bed, Wardrobe...), not the catalog name, and its size in cm;
- "Looks right" opens the placeholder room screen until the editor.

Engine: `adjustWallLength` moves the wall at the far end of the one being changed (so angles stay), refuses results under 1 m or that push a door or window off its wall. It does not move furniture; check how objects behave when a wall moves away from them (Phase 4).

**Arabic to review with a native speaker:** furniture type names we added, the dimensions form, capture note, wall names, "Longer / Shorter", "room gone" messages.

**Dev machines:** the design-compare dev server keeps running after a comparison; with it up, `npm run verify` can slow to a crawl and time out. Stop it first.

## My rooms (Phase 3.2)

Compared on the web build, English and Arabic, list and empty state (`COMPARE_GUEST=1 COMPARE_SEED=rooms npm run design:compare -- rooms en /rooms`; empty state: `rooms-empty` without the seed). All type, colour and spacing values match; what differs:

| Spec | Built | Why |
| --- | --- | --- |
| room pictures are 3D renders | plan drawings from above (`PlanView`) | our 3D renderer arrives in Phase 4; snapshots replace the drawings then |
| "Scan a room" label `#b68235` | `#7d5411` | AA contrast, as on Welcome |
| Arabic "Scan a room" in Cormorant with fallback glyphs | Amiri 700 | same prototype quirk as Welcome |
| way text starts at x 57 / 61 / 64 (numeral column shrinks to its digit) | all at 66 | the design's `width: 26px` numeral shrinks in a flex row; a fixed 26px column aligns cleanly |

**Honest caveats**
- ~~Rooms are saved on the device only~~ Sync now sends rooms to the server (see Sync).
- **Unreadable stored rooms are dropped and reported** to Sentry (the server copy comes back after sync exists).
- **The room screen is a placeholder** (name and plan) until the editor (Phase 4).
- "Edited …" labels count calendar days; beyond five weeks they read "Edited a while ago".
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
