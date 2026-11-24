# Photo capture worker (Phase 0 spike)

Turns photos of a room into the same RoomPlan-shaped JSON the app already imports
(`importRoomPlan` in `packages/core`). Sizes come from reconstructed 3D points only; the detector just names things.
Plan: `~/.claude/plans/lets-add-converting-photos-*.md`. **Gate before any app work:** walls close in at least 80% of rooms, worst wall
under ~10 cm before the one-wall scale check, main furniture found, GPU cost per room known.

| File | Does |
|---|---|
| `layout.py` | points → floor, ceiling, walls (closed polygon), doors/windows, furniture boxes. numpy only, tested |
| `reconstruct.py` | photos → MapAnything (`facebook/map-anything-apache`, Apache-2.0) → OWLv2 names → `layout.py` |
| `modal_app.py` | runs `reconstruct.py` on a rented L4 GPU |
| `accuracy.py` | result vs tape measure, before and after the one-wall scale, plus GPU time and cost |

## 1. Photograph and measure 5–8 rooms (owner)

Per room, make `rooms/<name>/photos/` and `rooms/<name>/tape.json`. The `rooms/` folder is gitignored: photos of homes are private.

- 15–25 photos, phone held upright, normal (1×) lens, lights on.
- Stand in each corner and in the middle of each wall; each photo should overlap the last by about half.
- Get floor/wall edges and every door and window in at least two photos. Ceiling optional.
- Tape every wall at floor level, wall to wall, and the ceiling height:
  `{"walls": [4.18, 3.62, 4.18, 3.62], "height": 2.70}`
- Include a mix: a bedroom, a living room/majlis, a small room, one L-shaped or irregular room, one cluttered room.

## 2. Run

```
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # layout + tests only, any machine
.venv/Scripts/python -m pytest -q tests

.venv/Scripts/pip install modal && .venv/Scripts/modal setup             # once; needs a Modal account (owner)
.venv/Scripts/modal run modal_app.py --room rooms/bedroom                # repeat per room
.venv/Scripts/python accuracy.py rooms                                   # the table for the go/no-go decision
```

## Still to check in the spike
- OWLv2 weights licence (code is in `transformers`, Apache-2.0); if it isn't commercial-safe, swap the detector or let
  people mark doors and windows on the plan in review.
- Whether MapAnything's metric scale alone is good enough, or the one-wall check is always needed (the app plans to ask anyway).
- Photos from the gallery (mixed zoom, no overlap) versus guided capture.
