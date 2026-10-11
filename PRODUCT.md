# Product brief (working name: BuildIt — final name TBD)

Scan any room with your iPhone, then rearrange it by hand or by telling an AI
designer what you want. Every size is measured, every move is checked against
interior design rules, and the app shows real products that would suit the
room and where to buy them.

## Who and where

- Homeowners and renters rearranging or furnishing any room.
- Oman first, then the rest of the GCC.
- English and Arabic (full RTL) from day one. Default follows the phone's
  language. Arabic uses Arabic-Indic digits (١٢٣).
- iPhone first. Android later.
- Free at launch; payments later. AI use is capped at 20 requests per account
  per day (server-side setting) so a free product can't be drained.

## The idea in one line

The AI understands what you want; a measured 3D design engine decides where
things go; interior design rules keep the result livable.

```
 AI layer        "more space for guests", "cosier", "face the TV"
   │  intent only (no coordinates, no sizes, no prices)
   ▼
 Design engine   exact centimetres: walls, doors, windows, collisions,
   │             walkways + interior design rules → position + score + reasons
   ▼
 3D room         measured from a scan, editable by hand
```

The AI never places furniture itself and never invents a size, price or
product. It states intent; the engine computes the pose and reports facts back
("walkway now 95 cm", "TV 4.1 m from sofa, too far for 55 inch").

## Getting the room in

| Phone | Method | What it gets |
| --- | --- | --- |
| LiDAR iPhone (Pro models) | Apple RoomPlan scan, about 1 minute | Walls, doors, windows, existing furniture as measured boxes |
| Any recent iPhone | Guided ARKit scan | Floor and walls detected, user taps corners, doors and windows; furniture measured by pointing at it and fitting a box. A vision model only names the item (sofa, wardrobe, colour), never sizes it |
| Anything | Type dimensions | Rectangle or L-shape, doors and windows by wall |

Every method ends on the same **scan review**: a top-down plan with all
measurements, where the user fixes anything wrong before designing.

All room types: living, bedroom, dining, office, kids, kitchen, bathroom,
hallway. Fixed items (counters, sinks, stoves, toilets, baths, stairs) are
captured as locked pieces that block space but can't be moved.

## Design rules (code, not prompt)

Scored and explained on every layout:

- Main walkway 90 cm, secondary 60 cm; every door and every piece of storage reachable.
- Door swings kept clear; tall items don't block windows.
- Sofa to coffee table 40–45 cm; seats in a group within talking distance (~2.5–3 m).
- TV 1.5–2.5× screen diagonal from the main seat, roughly at eye height.
- Bed: 60 cm clear on open sides. Dining chairs: 75–90 cm to pull out.
- Rug large enough for at least the front legs of the seating.
- Kitchen work triangle and counter clearances; bathroom fixture clearances.
- A clear focal point; walkways don't cut through the seating group.
- Natural light kept clear; desk and bed with a view of the door where possible.

The user sees a **room check**: each rule passing or failing in plain words,
with a one-tap "fix this".

## Look and feel

Very premium, expensive, calm and smooth. It must not look AI-generated.

- Restraint: a near-neutral palette, one accent, lots of space, few borders.
  The room is the hero, not the chrome.
- Typography does the work: one refined Latin face and a matching Arabic face
  of equal quality, a strict type scale, real weights (no faux bold).
- The 3D room looks like a product render: soft shadows, ambient occlusion,
  real material colours, gentle lighting — not a grey CAD box.
- Motion is physical and quick: springs, no bounce for its own sake;
  furniture glides into place when the AI moves it; haptics on snap, lock and
  undo.
- Avoid the AI-app look: no purple/blue gradients, no sparkle icons for "AI",
  no glassmorphism everywhere, no emoji, no chat-bubble-first layout, no
  generic rounded-card grids, no spinners (skeletons and narrated progress).
- Arabic layouts are designed, not mirrored as an afterthought.

## Screens

1. **Welcome** — language, one-line promise, sign in with Apple or email, or
   try without an account.
2. **My rooms** — rooms as large rendered thumbnails, name, last edited.
   Primary action: **Scan a room**. Empty state explains the three ways in.
3. **Choose how to capture** — the app detects LiDAR and recommends the best
   method; the others stay available.
4. **LiDAR scan** — RoomPlan camera with coaching ("move slower", "point at
   the corner"), then processing narrated with real progress.
5. **Guided scan** (non-LiDAR) — steps with progress: find the floor → mark
   each corner → mark doors and windows → point at each piece of furniture,
   confirm its name and box → done.
6. **Scan review** — plan view, every wall length editable, furniture list
   with sizes, "looks right" to continue.
7. **Room editor** (the heart of the app)
   - 3D dollhouse view with orbit; toggle to top-down plan.
   - Drag to move, handle to rotate, tap to select; locked items can't move.
   - "Walking space" overlay: where you can walk, where it's tight, with the
     narrowest gap labelled.
   - Room check: score and the top issue.
   - Undo / redo, versions.
   - Bottom sheet: **Ask AI**, **Add**, **Item**, **Finishes**.
8. **Ask AI** — suggestion chips ("more walking space", "make it cosier",
   "fit a dining table for 6", "suggest a rug"). Changes play out step by step
   in 3D; each answer ends with what changed and the measured facts. Keep,
   undo, or "show another option". Shows AI requests left today.
9. **Add** — generic furniture at real sizes, plus products: real items with
   size, photo and where to buy. Filter by type and "fits in this room".
10. **Item** — selected piece: size, colour, rotate, lock, replace, delete;
    for a product, where to buy it.
11. **Finishes** — wall colour, floor, and other room finishes.
12. **Product detail** — photo, dimensions, where to buy (shop website,
    WhatsApp or phone, whichever that shop uses), "place in my room", fit check.
13. **Versions** — every saved state with a thumbnail; restore any; nothing is lost.
14. **Share** — a rendered image of the room (3D or plan).
15. **Settings / account** — language, walkway preference, sign out, delete
    account and data.

Every empty, failed and waiting state says what happens next (scan failed in
low light → tips + retry + type dimensions instead; AI limit reached → when it
resets; nothing fits → why, and what to remove).

## Data

- Users, rooms, room versions (scene JSON), scans (raw capture, private
  storage), products (size, photo, where to buy, contact method), shops, AI
  usage per day, audit log for admin edits.
- Money, when prices arrive, is integer baisa (OMR has 3 decimals) and comes
  only from the server.
- Scans are private to the user (a home's layout is sensitive).

## Tech

- Expo (managed workflow, development builds), React Native, React Three Fiber
  native for 3D.
- Capture: `expo-roomplan` (LiDAR) and ARKit via `@reactvision/react-viro`, or a
  small custom Swift module if needed.
- Built and shipped with EAS Build / EAS Submit — no Mac required.
- Supabase: Postgres with RLS and column grants, auth (Apple + email), private
  storage, Edge Function for the AI loop.
- AI: Claude with tool use, streaming each change.
- Monorepo: `packages/core` (engine + rules, shared by app and server),
  `apps/mobile`, `supabase/`.

## Later

- Web 3D viewer for shared links (after image sharing).
- AR preview of the new layout in the real room.
- Shop partnerships: prices, room totals, shop dashboard, real 3D models.
- Payments. Android. Photoreal reconstruction from video.
