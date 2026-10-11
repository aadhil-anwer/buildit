# Handoff: BuildIt (working name) — room scan, editor and AI layout

## Overview
Mobile (iPhone-first) app: scan a room, rearrange it by hand or by asking an AI designer, with every move checked against interior design rules. This bundle covers the bedroom flow: Welcome, My rooms, Capture, LiDAR and Guided scan, Scan review, Room editor, Ask AI, Finishes, Versions, Share, Settings. English and Arabic (full RTL).

## About the Design Files
Everything here is a **design reference built in HTML**: a prototype showing intended look and behaviour, **not production code to copy**. Recreate it in the real stack from the product brief (Expo / React Native, React Three Fiber native, Supabase, monorepo with `packages/core`) using its own patterns and libraries.

## Fidelity
**High-fidelity** for visuals, type, spacing and motion intent. Capture screens use placeholders for the camera feed. 3D is three.js in the browser as a visual and behavioural reference for R3F.

## Files in this bundle
- `BuildIt.dc.html` — canvas: 3 navigation models (2a sheet, 2b tabs, 2c canvas) plus 19 key screens (1a–1s).
- `BuildIt Phone.dc.html` — the whole phone prototype: all screens, EN/AR strings (`D` dictionary), state and flows. Props: `nav` (sheet|tabs|canvas), `start` (screen), `lang`.
- `room3d.js` — room renderer **and the engine** (see below).
- Design system: Classical (`_ds/.../styles.css`) — tokens listed below.

## The engine (port to `packages/core`, plain TypeScript, no rendering)
In `room3d.js`, pure functions at the top: `rectOf`, `gapsOf`, `check`, `valid`, `optimize`, `largestFree`. Units are metres. Items: `{id, kind, w, d, h, x, z, rot(deg), group, edge, flat, locked, color}`. Rotated items use their axis-aligned bounds.
- **Gaps**: pairs of solid items (and walls) that overlap >10 cm on one axis and are 2–130 cm apart on the other. Items in the same `group` (bed + nightstands) are ignored; `edge` items ignore walls.
- **Rules → status**: walkway ≥90 pass, ≥60 tight, else fail (weight 10); door swing rectangle clear (8); bed sides ≥60 (6); wardrobe front ≥60 (6); window zone clear of items taller than 1.2 m (5). Score = 100 − 1.4 × Σ penalty (fail = full weight, tight = half), minus 3 if narrowest gap <100 cm.
- **Intent → layout** (`optimize`): greedy, up to 3 steps; tries moving each group by ±1.2 m in 5 cm steps; scores candidates by (score×100 + narrowest gap) − 12 × distance; rejects collisions and out-of-room; "show another option" re-runs with the first option's groups excluded.
- The AI never gives coordinates: in the prototype a keyword matcher stands in for the Claude tool-use call (intents: walk, rug, cosy, nofit). The real Edge Function should return intent only; `core` computes the pose and the facts shown to the user.

## Screens (see BuildIt Phone.dc.html for exact markup/styles)
Phone frame 390×844. Content padding 24 px; hairline dividers; outlined buttons.
1. **Welcome** — EN | ع toggle top; rendered room as a matted plate (.plate); headline 38/1.02 Cormorant 400; Apple, email, "try without account".
2. **My rooms** — H1 46; rooms as 196 px tall plates with name (26) + meta; primary "Scan a room" outlined gold, fixed bottom. Empty state: three numbered ways in.
3. **Capture** — LiDAR card with gold border and "Recommended" tag; other methods as hairline rows.
4. **LiDAR scan** — camera area, coaching pill (gold on dark), progress hairline; processing sheet narrates 4 steps with real % progress. Auto-advances to review.
5. **Guided scan** — 5-step bar; reticle; corner dots; "Mark corner" counts to 4.
6. **Scan failed** — tips list, Try again, Type dimensions instead.
7. **Scan review** — plan view with tappable wall lengths (stepper ±5 cm), furniture list with sizes, "Looks right".
8. **Room editor** — orbit (drag), pinch/wheel zoom, drag to move (5 cm grid, snaps to walls within 7 cm, refuses overlaps), rotate knob (15° snap), locked items can't move. Top bar: back, name, undo, redo, versions, share. Chips: Room check ring (gold stroke) with top issue; walking-space toggle; 3D | Plan. Bottom panel tabs: Ask, Add, Item, Finishes (+ Check).
9. **Ask AI** — chips, free text, "N of 20 requests left today". Running: narrated lines appear every ~850 ms while furniture glides. Done: what changed, measured facts (before → after), Keep / Undo / Show another option. Limit state: when it resets. Nothing-fits state: why, with measured free area, and a smaller alternative.
10. **Finishes** — wall (6) and floor (5) swatches, live.
11. **Versions** — thumbnails, restore; Keep on an AI change saves one.
12. **Share** — rendered image, 3D | Plan.
13. **Settings** — language, walkway preference (90 / 75 cm), AI usage, sign out, delete account (confirm dialog).
Not designed yet: Add with products, Product detail (Add lists generic pieces only, now including a floor lamp).

## Added in round 3
- **Platforms**: prop `platform` (ios|android) on the phone. Android differs in frame (34 px corners, 15 px punch-hole camera, left clock 14 px system font), 108×4 px gesture bar, 28 px sheet corners, and the tab bar uses a pill indicator (1 px gold outline + 10 % gold tint, 4×20 px padding, radius 16) instead of a top rule. Build native Material components for Android; keep the same tokens.
- **Suggestion card** (side popup in the editor): appears 2.6 s after entering the editor when idle (6 s between later ones), top 158 px, inline-end 14 px, width 216 px, bordered, pop-in .4 s. Not shown while something is selected, an AI run is active, or the Check panel is open. "Try it" applies the change through the engine and records one undo step; ✕ dismisses it for the session. Current rules: no floor lamp → lamp near the desk; no rug → 220 × 150 cm rug under the bed; chalk walls → sand walls; sage headboard → clay headboard. In production these are server or engine suggestions that return intents only.
- **Restyle** (Ask tab): Scandinavian, Japanese, Arabian, Modern, Classic. A style is a table of wall colour, floor and per-kind item colours (see `STYLES` in BuildIt Phone.dc.html). It never moves furniture; the engine re-runs all rules and reports "Layout unchanged" with walkway and score. Free text ("make it Japanese") maps to the same intents.
- **Suggested next** (Ask tab, top three, plus the first one as "Next:" after an AI result): fix the remaining failing rule, add a rug, check walking space, save a version, try a style. Computed from the room check, items, history and versions.
- **Floor lamp** piece: 35 × 35 × 155 cm, brass pole, emissive warm shade.
- AI undo now reverts to the history index from before the request (one tap undoes a multi-step change).

## Performance note for the prototype
Many 3D canvases on one page exceed browser WebGL limits; the prototype mounts at most 5 live rooms and only for phones on screen. This is a prototype constraint only.

## Navigation models (decision pending)
2a Sheet (room full-bleed, bottom sheet 196/404/640 px) · 2b Tabs (room 340 px + panel, tab bar: Rooms / Design / Versions / Settings) · 2c Canvas (no chrome; ask pill + add + finishes buttons; item bar on selection).

## Interactions & motion
- Furniture glide: exponential smoothing, ~11/s. Camera orbit/zoom: ~9/s. Walls facing the camera drop to 10 % height automatically; Plan view flattens all walls to 3 %.
- Sheet height transition .38 s cubic-bezier(.2,.8,.2,1). Haptics (not in prototype): snap, lock, undo.
- No spinners: skeletons / narrated progress.

## 3D look
Orthographic camera, elevation 33°, azimuth 38°. ACES tone mapping, exposure .92; hemisphere + warm key light with soft shadows; blob contact shadows; rounded bevelled boxes; plank floor texture. Furniture colours: wood #b88d62, linen #ece6da, sage #a6ad9b, clay #b0765a, wardrobe #d6cdbf. Walls: chalk #efe9e0, sand #e2d5c0, sage #b9c1ac, clay #d1b2a0, stone #c9c6bf, ink #4a4947. Floors: oak #c9a97f, walnut #8c6747, ash #d9ccb7, stone #c3bdb2, concrete #aaa8a3.

## State
screen, nav stack, language, tab, sheet size, view (3d/plan), walk overlay, selection, undo/redo history of scene JSON (`items[], wall, floor, w, d`), versions[], AI phase (idle/running/done/limit/nofit), AI requests left, room check result, walkway preference.

## Design tokens (Classical)
Colours: bg #f3f2f2, surface #eae9e9, text #201f1d, accent #b68235 (text use accent-700 #7d5411), divider = text at 16 %. Rust for failing states #a04828 / #8c3a1c (added; not in the system). Gold also marks AI-active states and the score ring.
Type: Cormorant Garamond 400/600 headings, Lora 400/600 body; Arabic: Amiri headings, Noto Naskh Arabic body (line-height 1.85, no letter-spacing). Numbers tabular. Arabic digits ٠–٩ and ٫ separator in Arabic.
Radius 4 (buttons), pills 99, sheets 20. Shadows: sm 0 1px 2px, md 0 3px 10px, lg 0 12px 32px (ink-tinted). Icons: Lucide, 1.5 stroke.
RTL: logical properties; layouts are mirrored by direction but copy, type size and line height are tuned for Arabic.

## Assets
No photography: room images are rendered from the 3D scene. Icons are Lucide paths inlined in the prototype.
