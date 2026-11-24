"""Synthetic rooms with known sizes: the layout must recover them to within a few centimetres."""
import json
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import layout  # noqa: E402

RNG = np.random.default_rng(7)
H = 2.7


def wall_points(a, b, gaps=(), per_m2=900):
    """Points on the vertical wall a->b (x,z), with rectangular holes (t0, t1, y0, y1) for doors and windows."""
    a, b = np.array(a, float), np.array(b, float)
    length = np.linalg.norm(b - a)
    n = int(length * H * per_m2)
    t, y = RNG.uniform(0, length, n), RNG.uniform(0, H, n)
    keep = np.ones(n, bool)
    for t0, t1, y0, y1 in gaps:
        keep &= ~((t > t0) & (t < t1) & (y > y0) & (y < y1))
    t, y = t[keep], y[keep]
    d = (b - a) / length
    xz = a + np.outer(t, d)
    return np.column_stack([xz[:, 0], y, xz[:, 1]])


def plane_points(corners, y, per_m2=300):
    xs, zs = [c[0] for c in corners], [c[1] for c in corners]
    n = int((max(xs) - min(xs)) * (max(zs) - min(zs)) * per_m2)
    p = np.column_stack([RNG.uniform(min(xs), max(xs), n), np.full(n, y), RNG.uniform(min(zs), max(zs), n)])
    return p


def box_points(cx, cz, w, d, h, n=1500):
    x = RNG.uniform(cx - w / 2, cx + w / 2, n)
    z = RNG.uniform(cz - d / 2, cz + d / 2, n)
    y = RNG.uniform(0, h, n)
    return np.column_stack([x, y, z])


def shake(p, yaw_deg, tilt_up):
    """Noise, then an arbitrary world frame: rotate about Y, then tilt so 'up' is no longer +Y."""
    p = p + RNG.normal(0, 0.01, p.shape)
    a = np.radians(yaw_deg)
    ry = np.array([[np.cos(a), 0, np.sin(a)], [0, 1, 0], [-np.sin(a), 0, np.cos(a)]])
    tilt = layout.up_rotation(np.array(tilt_up, float)).T  # maps +Y onto tilt_up
    return p @ ry.T @ tilt.T + np.array([3.0, -1.2, 5.0]), np.array(tilt_up, float)


def rect_room():
    w, d = 4.2, 3.6
    c = [(0, 0), (w, 0), (w, d), (0, d)]
    pts = [
        wall_points(c[0], c[1], gaps=[(1.5, 2.9, 0.9, 2.1)]),  # window
        wall_points(c[1], c[2]),
        wall_points(c[2], c[3], gaps=[(0.4, 1.3, 0.0, 2.05)]),  # door (header above stays)
        wall_points(c[3], c[0]),
        plane_points(c, 0.0),
        plane_points(c, H, per_m2=80),
        box_points(1.2, 2.4, 2.0, 0.9, 0.85),  # sofa against nothing, clutter
        box_points(3.6, 0.4, 0.5, 0.4, 0.55),  # nightstand by a wall
        box_points(2.0, -2.5, 3.0, 2.0, 2.0, n=800),  # tree seen through the window, outside
    ]
    return np.vstack(pts), (w, d)


def edge_lengths(result):
    return sorted(round(w["dimensions"][0], 2) for w in result["walls"])


def test_rectangular_room_with_door_window_furniture_and_outside_clutter():
    pts, (w, d) = rect_room()
    world, up = shake(pts, yaw_deg=23, tilt_up=[0.2, 0.95, -0.1])
    out = layout.fit_layout(world, up)
    assert len(out["walls"]) == 4
    lens = edge_lengths(out)
    assert lens[0] == pytest.approx(d, abs=0.04) and lens[1] == pytest.approx(d, abs=0.04)
    assert lens[2] == pytest.approx(w, abs=0.04) and lens[3] == pytest.approx(w, abs=0.04)
    assert out["ceilingHeight"] == pytest.approx(H, abs=0.04)


def test_l_shaped_room():
    c = [(0, 0), (5, 0), (5, 2.5), (2.5, 2.5), (2.5, 4), (0, 4)]
    pts = [wall_points(c[k], c[(k + 1) % 6]) for k in range(6)]
    pts.append(np.vstack([plane_points([c[0], c[1], (5, 2.5), (0, 2.5)], 0.0), plane_points([(0, 2.5), (2.5, 2.5), c[4], c[5]], 0.0)]))
    world, up = shake(np.vstack(pts), yaw_deg=-37, tilt_up=[0, 1, 0])
    out = layout.fit_layout(world, up)
    assert len(out["walls"]) == 6
    assert edge_lengths(out) == pytest.approx(sorted([5, 2.5, 2.5, 1.5, 2.5, 4]), abs=0.05)


def test_detected_furniture_is_sized_from_its_points_and_doors_snap_to_a_wall():
    pts, _ = rect_room()
    sofa = box_points(1.2, 2.4, 2.0, 0.9, 0.85)
    door = wall_points((4.2, 3.6), (0, 3.6))[:0]  # no points in the hole itself; use the frame instead
    frame = np.vstack([box_points(0.4 + 0.45, 3.6, 0.9, 0.06, 2.05, n=600)])
    world, up = shake(np.vstack([pts, sofa, frame]), yaw_deg=10, tilt_up=[0, 1, 0])
    n0, n1 = len(pts), len(pts) + len(sofa)
    out = layout.fit_layout(world, up, detections=[{"category": "sofa", "points": world[n0:n1]}, {"category": "door", "points": world[n1:]}])
    (s,) = out["objects"]
    assert sorted(s["dimensions"][::2]) == pytest.approx([0.9, 2.0], abs=0.08)
    assert s["dimensions"][1] == pytest.approx(0.85, abs=0.05)
    (dr,) = out["doors"]
    assert dr["dimensions"][0] == pytest.approx(0.9, abs=0.08)
    assert door.size == 0


def test_writes_fixture_the_typescript_importer_reads():
    """Keeps packages/core/tests/fixtures/photo-layout-rect.json in step with this code."""
    pts, _ = rect_room()
    world, up = shake(pts, yaw_deg=23, tilt_up=[0.2, 0.95, -0.1])
    out = layout.fit_layout(world, up)
    fixture = Path(__file__).resolve().parents[3] / "packages/core/tests/fixtures/photo-layout-rect.json"
    fixture.parent.mkdir(exist_ok=True)
    fixture.write_text(json.dumps(out, indent=1) + "\n")
