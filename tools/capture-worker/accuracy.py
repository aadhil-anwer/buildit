"""Compare each room's result.json with the tape measure in tape.json, before and after the one-wall scale check.

    python accuracy.py rooms

tape.json: {"walls": [4.18, 3.62, 4.18, 3.62], "height": 2.70}   (metres, any order)
The app will ask the user to measure ONE wall; here that is the longest wall in tape.json.
"""
import json
import sys
from pathlib import Path

GPU_PER_HOUR = 0.80  # USD, Modal L4 list price at the time of writing; check before quoting


def errors(est: list[float], tape: list[float]) -> list[float]:
    """Pair walls by length rank (walls come back in a different order and orientation)."""
    return [abs(a - b) for a, b in zip(sorted(est), sorted(tape))]


def room_row(folder: Path) -> str:
    res = json.loads((folder / "result.json").read_text())
    tape = json.loads((folder / "tape.json").read_text())
    est = [w["dimensions"][0] for w in res["walls"]]
    if len(est) != len(tape["walls"]):
        return f"| {folder.name} | {len(est)} walls found, {len(tape['walls'])} measured | – | – | – | – |"
    scale = max(tape["walls"]) / max(est)
    raw, fixed = errors(est, tape["walls"]), errors([e * scale for e in est], tape["walls"])
    t = res["timing"]
    secs = t["reconstruct_s"] + t["detect_s"] + t["layout_s"]
    return (f"| {folder.name} | {max(raw) * 100:.0f} cm | {max(fixed) * 100:.0f} cm | {abs(res['ceilingHeight'] - tape.get('height', res['ceilingHeight'])) * 100:.0f} cm"
            f" | {len(res['objects'])} pieces, {len(res['doors'])} doors, {len(res['windows'])} windows | {secs:.0f} s (${secs / 3600 * GPU_PER_HOUR:.3f}) |")


if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "rooms")
    print("| Room | Worst wall error | After one-wall scale | Height error | Found | GPU time (cost) |")
    print("|---|---|---|---|---|---|")
    for folder in sorted(p for p in root.iterdir() if (p / "result.json").exists() and (p / "tape.json").exists()):
        print(room_row(folder))
