# BuildIt: talk to your room

An editable 3D room where you rearrange furniture by hand or by asking an AI
designer ("move the sofa to face the TV", "give me more walking space",
"make it work for 10 guests"). The AI never places things itself. It states
intent, and a layout engine works out the exact position, checking walls,
doors, windows, collisions and walking space. Every change is a version you
can undo.

This is the MVP: **rearranging a room**. Shop products (furniture and
building materials) plug in gradually through a CSV import, and iPhone LiDAR
scans plug in through an importer. Neither is required to use the app.

## Status

| Area | State |
| --- | --- |
| Room from dimensions (rectangle), doors, windows | Works |
| Non-rectangular rooms (L-shapes) in the engine | Works (engine + import); the "New room" form only makes rectangles |
| 41 parametric furniture items, drag, rotate, resize, recolour, lock, delete | Works |
| Layout engine: collisions, room bounds, door swings, windows, walkway widths | Works, unit-tested |
| AI designer (Claude, tool use, streamed changes, undo / show another option) | Loop tested against a fake model client; **not yet run against the live API** |
| Version history (never loses a version), autosave, multiple rooms | Works (browser localStorage) |
| Share link (whole room in the URL fragment, nothing uploaded) | Works |
| Shop products via CSV | Works; `data/products.json` ships empty |
| Apple RoomPlan scan import | Written and tested on a synthetic scan; **not yet verified with a real device export** |
| iOS capture app | Not started (see [docs/IPHONE_LIDAR.md](docs/IPHONE_LIDAR.md)) |

## Quick start

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY to use the AI designer
npm run dev                  # http://localhost:3000
npm test                     # engine, agent loop, importers
npm run typecheck
```

Without an API key everything except the chat works.

## How it works

```
 you (text)      ┌──────────────────────── server ───────────────────────┐
 ──────────────► │ /api/agent  →  Claude (tools)  →  core/ops  →  engine │
                 │        ▲            │ intent: "against west wall"     │
                 │        └── result ◄─┘ facts: "path now 95 cm"         │
                 └──────────────────────────┬────────────────────────────┘
                                            │ NDJSON stream of scene states
 you (mouse) ──► editor (React Three Fiber) ◄┘ animates each step, then saves one version
```

- **`src/core`**: framework-free TypeScript. It runs in the browser and on the server, and later can run behind an iOS app.
  - `types.ts`: the scene model. Metres, top-down X/Z (north up), clockwise room outline, rotation 0 = facing south.
  - `layout/validate.ts`: hard rules. Inside the room, no overlaps (chairs may tuck under tables, rugs go under anything), door swing kept clear, tall items in front of windows flagged.
  - `layout/clearance.ts`: walking space. A 5 cm floor grid and a widest-path search from each door give, for every piece that needs reaching, the narrowest point on the best route and **which two things form it** ("45 cm between office_chair_1 and bed_1"). Storage must be reachable along its whole front (every door); seating needs one spot. The same pass drives the green/red "Walking space" overlay.
  - `layout/placement.ts`: the solver. It turns intent (`against_wall`, `next_to`, `near`, `nudge`) into a pose by scoring candidates, then prefers the one that keeps walkways open. When nothing fits it says why.
  - `layout/improve.ts`: hill-climbing for "less cramped". Small moves and quarter turns that lower collisions and walkway shortfall, with a cost for moving things away from where you put them.
  - `ops.ts`: every edit (move, multi-object layout, rotate, add, replace, arrange chairs around a table, recolour, lock…) as a pure function returning a new scene plus a factual message.
- **`src/agent`**: Claude tool definitions (zod-validated), the system prompt (design defaults, style palettes, the catalog), and the streaming tool loop. Each tool result tells the model what changed and what problems the layout now has.
- **`src/editor`**: the web app. Zustand store with branching version history, R3F viewport (dollhouse walls, drag on the floor plane, plan view, walkway overlay), panels, and the client for the agent stream.

### AI tools

`apply_layout` (rearrange several pieces at once; they are lifted first so they don't block each other), `move_object`, `rotate_object`, `add_object`, `remove_object`, `replace_object`, `arrange_around`, `improve_layout`, `lock_object`, `resize_object`, `set_color`, `set_room_finish`, `set_min_walkway`, `get_layout_report`.

The model is `claude-opus-5-5` with adaptive thinking, effort `medium`, and server-side refusal fallback enabled. Override with `AGENT_MODEL` / `AGENT_EFFORT`.

## Adding shop products

Products are ordinary catalog items with a price, a shop and real dimensions. They render with the generic model for their type at their real size, so no 3D modelling is needed to start.

1. Fill a spreadsheet with the columns in `data/products.example.csv` (`sku, name, shop, type, width_cm, depth_cm, height_cm, price, currency, color, seats, in_stock, url`) and export it as CSV.
2. `npm run import-products -- path/to/products.csv` validates every row and writes `data/products.json`. Nothing is written if any row has an error.
3. Rebuild or redeploy. Products appear under "From shops" with prices, the AI can use them, and the room shows a running total of priced items.

The AI is told that most catalog items are generic and unpriced and never to invent prices, so budget requests stay honest until enough real products exist.

## iPhone / LiDAR

`src/core/importers/roomplan.ts` turns an Apple RoomPlan `CapturedRoom` (JSON-encoded on the phone) into a scene: walls into an outline, doors and windows onto walls, detected furniture into editable pieces, and appliances into locked fixtures. Import it from **New room → Import file or scan**. The plan for a capture app is in [docs/IPHONE_LIDAR.md](docs/IPHONE_LIDAR.md).

## Deploying

Any Node host that runs Next.js works (e.g. Vercel). Set `ANTHROPIC_API_KEY`. `/api/agent` streams for up to 120 s per request.

Before sharing a public link, set `AGENT_ACCESS_CODE`; users are asked for it once. Without it, anyone with the URL can spend your API credits. There is no per-user rate limiting yet.

## Project layout

```
src/core/        scene model, geometry, catalog, layout engine, ops, importers (no React)
src/agent/       Claude tools, prompt, tool loop
src/app/         Next.js page and /api/agent route
src/editor/      store, history, persistence, 3D viewport and panels
scripts/         import-products.ts
data/            products.json (generated), products.example.csv
tests/           vitest: layout engine, agent loop, importers, share links
docs/            IPHONE_LIDAR.md
```
