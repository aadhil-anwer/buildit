"""Metric point cloud of a room -> RoomPlan-shaped JSON for packages/core importRoomPlan.

Sizes come only from the points (PRODUCT.md: a vision model may name a thing, never size it).
Pure numpy so it runs and is tested on any machine; the GPU part lives in reconstruct.py.

Output frame: metres, +Y up, floor at y=0. Transforms are column-major 4x4 like Apple's CapturedRoom,
with the local x axis along the wall / object width and translation at the centre.
"""
from __future__ import annotations

from collections import deque

import numpy as np

CELL = 0.05  # grid size in metres; also the editor's 5 cm step
MIN_EDGE = 0.25  # wall jogs shorter than this are clutter, not walls


def up_rotation(up: np.ndarray) -> np.ndarray:
    """Rotation matrix that turns `up` into +Y."""
    u = up / np.linalg.norm(up)
    y = np.array([0.0, 1.0, 0.0])
    v, c = np.cross(u, y), float(np.dot(u, y))
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3) if c > 0 else np.diag([1.0, -1.0, -1.0])
    k = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + k + k @ k * (1 / (1 + c))


def floor_and_ceiling(y: np.ndarray) -> tuple[float, float]:
    """Floor and ceiling are the lowest and highest dense horizontal layers (2 cm bins)."""
    hist, edges = np.histogram(y, bins=np.arange(y.min(), y.max() + 0.02, 0.02))
    dense = np.nonzero(hist >= 0.2 * hist.max())[0]
    floor = edges[dense[0]] + 0.01
    top = edges[dense[-1]] + 0.01
    ceiling = top if top - floor > 2.0 else float(np.percentile(y, 99.5))  # ceiling often not photographed
    return float(floor), float(ceiling)


def _spread_score(xz: np.ndarray, angle: float) -> float:
    c, s = np.cos(angle), np.sin(angle)
    x, z = xz[:, 0] * c + xz[:, 1] * s, -xz[:, 0] * s + xz[:, 1] * c
    hx, _ = np.histogram(x, bins=max(1, int(np.ptp(x) / CELL)))
    hz, _ = np.histogram(z, bins=max(1, int(np.ptp(z) / CELL)))
    return float((hx.astype(float) ** 2).sum() + (hz.astype(float) ** 2).sum())


def dominant_angle(xz: np.ndarray) -> float:
    """Yaw (radians, 0..pi/2) that lines the walls up with the axes: walls pile points into few histogram bins."""
    coarse = np.radians(np.arange(0, 90, 1.0))
    best = max(coarse, key=lambda a: _spread_score(xz, a))
    fine = best + np.radians(np.arange(-1, 1.01, 0.1))
    return float(max(fine, key=lambda a: _spread_score(xz, a)) % (np.pi / 2))


def _rot2(xz: np.ndarray, angle: float) -> np.ndarray:
    c, s = np.cos(angle), np.sin(angle)
    return np.stack([xz[:, 0] * c + xz[:, 1] * s, -xz[:, 0] * s + xz[:, 1] * c], axis=1)


def _dilate(m: np.ndarray, r: int) -> np.ndarray:
    out = m.copy()
    for dx in range(-r, r + 1):
        for dz in range(-r, r + 1):
            out |= np.roll(np.roll(m, dx, 0), dz, 1)
    return out


def _erode(m: np.ndarray, r: int) -> np.ndarray:
    return ~_dilate(~m, r)


def _flood(free: np.ndarray, seeds: list[tuple[int, int]]) -> np.ndarray:
    seen = np.zeros_like(free)
    q = deque(s for s in seeds if free[s])
    for s in q:
        seen[s] = True
    while q:
        i, j = q.popleft()
        for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
            if 0 <= a < free.shape[0] and 0 <= b < free.shape[1] and free[a, b] and not seen[a, b]:
                seen[a, b] = True
                q.append((a, b))
    return seen


def _largest_component(m: np.ndarray) -> np.ndarray:
    best, left = np.zeros_like(m), m.copy()
    while left.any():
        comp = _flood(left, [tuple(np.argwhere(left)[0])])
        if comp.sum() > best.sum():
            best = comp
        left &= ~comp
    return best


def footprint(xz: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Inside of the walls on a grid: everything not reachable from outside without crossing wall points."""
    lo = xz.min(axis=0) - 0.5
    idx = np.floor((xz - lo) / CELL).astype(int)
    shape = tuple(idx.max(axis=0) + 11)
    counts = np.zeros(shape, int)
    np.add.at(counts, (idx[:, 0], idx[:, 1]), 1)
    walls = _erode(_dilate(counts >= 2, 3), 1)  # seal small gaps (wall seams, sparse patches); doors keep their header
    border = [(i, j) for i in (0, shape[0] - 1) for j in range(shape[1])] + [(i, j) for j in (0, shape[1] - 1) for i in range(shape[0])]
    inside = ~_flood(~walls, border)
    inside = _dilate(_erode(_largest_component(inside), 3), 3)  # drop thin protrusions
    return _largest_component(inside), lo


def trace(mask: np.ndarray) -> list[tuple[int, int]]:
    """Corners (grid vertices) of the outline of a single rectilinear region, in order."""
    edges: dict[tuple[int, int], tuple[int, int]] = {}
    for i, j in np.argwhere(mask):
        if i == 0 or not mask[i - 1, j]:
            edges[(i, j + 1)] = (i, j)
        if i == mask.shape[0] - 1 or not mask[i + 1, j]:
            edges[(i + 1, j)] = (i + 1, j + 1)
        if j == 0 or not mask[i, j - 1]:
            edges[(i, j)] = (i + 1, j)
        if j == mask.shape[1] - 1 or not mask[i, j + 1]:
            edges[(i + 1, j + 1)] = (i, j + 1)
    start = min(edges)
    loop, p = [start], edges[start]
    while p != start:
        loop.append(p)
        p = edges[p]
    return [loop[k] for k in range(len(loop)) if _turns(loop[k - 1], loop[k], loop[(k + 1) % len(loop)])]


def _turns(a, b, c) -> bool:
    return (b[0] - a[0]) * (c[1] - b[1]) != (b[1] - a[1]) * (c[0] - b[0])


def drop_short_edges(pts: list[np.ndarray], min_len: float) -> list[np.ndarray]:
    """Remove jogs: a short edge between two parallel edges is collapsed, merging them into one wall."""
    pts = [p.astype(float) for p in pts]
    while len(pts) > 4:
        n = len(pts)
        lens = [np.linalg.norm(pts[(k + 1) % n] - pts[k]) for k in range(n)]
        k = int(np.argmin(lens))
        if lens[k] >= min_len:
            break
        a, b = pts[k], pts[(k + 1) % n]
        axis = 0 if abs(b[0] - a[0]) > abs(b[1] - a[1]) else 1  # the short edge runs along this axis
        nxt = (k + 2) % n
        pts[nxt][axis] = a[axis]  # the following wall moves onto the preceding one
        pts = [p for i, p in enumerate(pts) if i not in ((k + 1) % n,)]
        pts = [p for i, p in enumerate(pts) if _turns(pts[i - 1], p, pts[(i + 1) % len(pts)])]
    return pts


def refine(corners: list[np.ndarray], xz: np.ndarray) -> list[np.ndarray]:
    """Move each axis-aligned wall to the median of the wall points near it (grid -> centimetres)."""
    n, out = len(corners), [c.copy() for c in corners]
    for k in range(n):
        a, b = corners[k], corners[(k + 1) % n]
        axis = 1 if abs(b[0] - a[0]) > abs(b[1] - a[1]) else 0  # coordinate that is constant along this wall
        along = 1 - axis
        lo, hi = sorted((a[along], b[along]))
        near = xz[(np.abs(xz[:, axis] - a[axis]) < 0.15) & (xz[:, along] > lo + 0.1) & (xz[:, along] < hi - 0.1)]
        if len(near) > 20:
            v = float(np.median(near[:, axis]))
            out[k][axis] = v
            out[(k + 1) % n][axis] = v
    return out


def _item(center: np.ndarray, x_axis: np.ndarray, dims: tuple[float, float, float], category: str) -> dict:
    """RoomPlan-style item: column-major transform with the local x axis on the floor."""
    x = np.array([x_axis[0], 0.0, x_axis[1]]) / np.linalg.norm(x_axis)
    y = np.array([0.0, 1.0, 0.0])
    z = np.cross(x, y)
    m = [*x, 0.0, *y, 0.0, *z, 0.0, *center, 1.0]
    return {"category": category, "dimensions": [round(d, 4) for d in dims], "transform": [round(float(v), 5) for v in m]}


def wall_items(corners: list[np.ndarray], height: float) -> list[dict]:
    n, out = len(corners), []
    for k in range(n):
        a, b = corners[k], corners[(k + 1) % n]
        mid = (a + b) / 2
        out.append(_item(np.array([mid[0], height / 2, mid[1]]), b - a, (float(np.linalg.norm(b - a)), height, 0.1), "wall"))
    return out


def fit_box(p: np.ndarray, floor: float) -> tuple[np.ndarray, np.ndarray, tuple[float, float, float]]:
    """Oriented box round one object's points (already +Y up): smallest footprint over yaw, robust percentiles."""
    xz = p[:, [0, 2]]
    best = None
    for a in np.radians(np.arange(0, 90, 2.0)):
        r = _rot2(xz, a)
        lo, hi = np.percentile(r, 1, axis=0), np.percentile(r, 99, axis=0)
        area = float(np.prod(hi - lo))
        if best is None or area < best[0]:
            best = (area, a, lo, hi)
    _, a, lo, hi = best
    c_local = (lo + hi) / 2
    c, s = np.cos(a), np.sin(a)
    centre_xz = np.array([c_local[0] * c - c_local[1] * s, c_local[0] * s + c_local[1] * c])
    h = float(np.percentile(p[:, 1], 99) - floor)
    w, d = float(hi[0] - lo[0]), float(hi[1] - lo[1])
    return np.array([centre_xz[0], h / 2, centre_xz[1]]), np.array([c, s]), (w, h, d)


def opening_item(p: np.ndarray, corners: list[np.ndarray], category: str) -> dict | None:
    """A door or window from points on its frame/glass: width along the nearest wall, bottom and top from y."""
    xz = np.median(p[:, [0, 2]], axis=0)
    n = len(corners)
    def cross2(u: np.ndarray, v: np.ndarray) -> float:
        return float(u[0] * v[1] - u[1] * v[0])

    dist = [abs(cross2(corners[(k + 1) % n] - corners[k], xz - corners[k])) / np.linalg.norm(corners[(k + 1) % n] - corners[k]) for k in range(n)]
    k = int(np.argmin(dist))
    if dist[k] > 0.4:
        return None
    a, b = corners[k], corners[(k + 1) % n]
    d = (b - a) / np.linalg.norm(b - a)
    t = (p[:, [0, 2]] - a) @ d
    t0, t1 = np.percentile(t, 1), np.percentile(t, 99)
    y0 = 0.0 if category == "door" else float(np.percentile(p[:, 1], 3))
    y1 = float(np.percentile(p[:, 1], 97))
    mid = a + d * (t0 + t1) / 2
    return _item(np.array([mid[0], (y0 + y1) / 2, mid[1]]), d, (float(t1 - t0), y1 - y0, 0.1), category)


def fit_layout(points: np.ndarray, up: np.ndarray, detections: list[dict] | None = None) -> dict:
    """points: (N,3) metric, any frame. up: world up vector. detections: [{category, points (M,3)}] in the same frame."""
    rot = up_rotation(np.asarray(up, float))
    p = points @ rot.T
    floor, ceiling = floor_and_ceiling(p[:, 1])
    band = p[(p[:, 1] > floor + 0.15) & (p[:, 1] < ceiling - 0.05)]
    yaw = dominant_angle(band[:, [0, 2]])
    xz = _rot2(band[:, [0, 2]], yaw)
    mask, lo = footprint(xz)
    corners = [np.array(c, float) * CELL + lo for c in trace(mask)]
    corners = refine(drop_short_edges(corners, MIN_EDGE), xz)
    height = ceiling - floor
    out: dict = {"walls": wall_items(corners, height), "doors": [], "windows": [], "objects": [], "source": "photos", "ceilingHeight": round(height, 3)}
    for det in detections or []:
        q = np.asarray(det["points"], float) @ rot.T
        q = np.column_stack([_rot2(q[:, [0, 2]], yaw)[:, 0], q[:, 1] - floor, _rot2(q[:, [0, 2]], yaw)[:, 1]])
        if len(q) < 30:
            continue
        cat = det["category"]
        if cat in ("door", "window"):
            item = opening_item(q, corners, cat)
            if item:
                out[cat + "s"].append(item)
        else:
            centre, x_axis, dims = fit_box(q, 0.0)
            out["objects"].append(_item(centre, x_axis, dims, cat))
    return out
