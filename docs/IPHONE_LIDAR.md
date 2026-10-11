# iPhone + LiDAR: how scanning fits in

## Recommendation

Use LiDAR as the fastest way to get a room into BuildIt, not as the only way.

- RoomPlan (Apple's scanning framework) gives walls, doors, windows and the
  user's existing furniture as measured boxes in about a minute. For a
  "rearrange my room" product, that removes the biggest pain point: typing
  in the size of every sofa and cabinet.
- It only runs on LiDAR devices: iPhone 12 Pro and later Pro models, and
  iPad Pro. "LiDAR only" would shut out every Android user and every
  non-Pro iPhone before we know the core interaction works.
- The most valuable early scanner is probably not the consumer. A
  salesperson from the furniture shop measuring a customer's majlis or
  living room carries one Pro phone, and coverage of customers' phones
  stops mattering. Majlis seating is often made to fit the room, which
  makes accurate measurement worth paying for.

## Architecture

```
iPhone (Swift, RoomPlan)                 web / server (this repo)
┌───────────────────────────┐            ┌──────────────────────────────────┐
│ RoomCaptureView           │  JSON      │ core/importers/roomplan.ts       │
│   → CapturedRoom          │ ─────────► │   → Scene (same model as the web)│
│ JSONEncoder().encode(room)│  upload or │ layout engine + AI + editor      │
└───────────────────────────┘  share     └──────────────────────────────────┘
```

The editor can run inside the iOS app in a `WKWebView`, so there is one
editor for web, iOS and later Android. Only the capture screen needs to be
native.

## What the capture app must do (v0)

1. Show `RoomCaptureView` and run a `RoomCaptureSession` (RoomPlan, iOS 16+;
   iOS 17+ for better furniture categories and multi-room).
2. When the user finishes, take the final `CapturedRoom` (from
   `RoomBuilder` with `.beautifyObjects`), and encode it with
   `JSONEncoder()`.
3. Hand the JSON to the editor: share it as a file, or POST it to an upload
   endpoint (to be added), then open the editor with that room.

## What the importer does today

- Walls are chained into a closed outline (falling back to a bounding
  rectangle), so L-shaped rooms keep their shape.
- Doors, windows and open passages are snapped to their nearest wall, with
  window sill heights taken from the scan.
- Furniture categories are mapped to editable pieces: sofa, chair (armchair
  or dining chair by size), table (coffee, side, dining or desk by size and
  height), bed, storage (wardrobe, shelf, dresser, sideboard, nightstand), and
  a TV on storage becomes a TV unit. Each piece's front is chosen so its back
  faces the nearest wall.
- Fridges, stoves, sinks, toilets, baths, stairs and fireplaces become
  locked fixed items that block space but can't be moved.
- RoomPlan's coordinates start wherever the phone started, so compass
  directions are relative: the longest wall is lined up east-west.

## Risks to check with the first real scans

- **JSON shape.** The importer accepts both shapes I expect from
  `JSONEncoder`: categories as strings or `{"sofa": {}}`, and transforms as 16
  numbers or 4 columns. It has only been tested on a synthetic scan. Run it
  on real exports from at least two iOS versions before relying on it.
- **Room size and conditions.** Apple advises against very large rooms, and
  big majlis rooms are near that limit. Mirrors, glass, dark rooms and
  clutter all degrade scans.
- **Furniture detection is coarse.** There is no rug, lamp or coffee-table
  category, and objects come back as boxes. Users will still correct
  sizes, which the inspector supports.
- **Testing needs hardware.** RoomPlan does not run in the simulator, so you
  need a Mac with Xcode, an Apple developer account and a LiDAR iPhone.
