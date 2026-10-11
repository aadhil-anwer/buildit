/* BuildIt room engine + renderer (placeholder implementation for the prototype). Needs window.THREE (r160). */
(function () {
function run() {
const T = window.THREE;
const H = 2.5, WT = 0.1;
const FLOORS = { oak: '#c9a97f', walnut: '#8c6747', ash: '#d9ccb7', stone: '#c3bdb2', concrete: '#aaa8a3' };
const D2R = Math.PI / 180;
const M = (c, r = 0.85, m = 0) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

/* ───────── presets ───────── */
function preset(name) {
  if (name === 'living') return { room: { w: 5.2, d: 4.1, doors: [{ wall: 'S', c: 4.4, wd: 0.9 }], windows: [{ wall: 'N', c: 2.2, wd: 2.0, sill: 0.8, h: 1.5 }] }, wall: '#e2d5c0', floor: 'walnut', items: [
    { id: 'rug', kind: 'rug', name: 'Rug', w: 2.8, d: 2.0, h: 0.02, x: 2.6, z: 2.0, rot: 0, flat: 1, color: '#d6cab5' },
    { id: 's1', kind: 'sofa', name: 'Sofa', w: 2.6, d: 0.95, h: 0.8, x: 2.6, z: 3.55, rot: 180, color: '#8f9a86' },
    { id: 's2', kind: 'sofa', name: 'Sofa', w: 1.9, d: 0.9, h: 0.8, x: 0.55, z: 1.8, rot: -90, color: '#8f9a86' },
    { id: 'tb', kind: 'table', name: 'Coffee table', w: 1.1, d: 0.6, h: 0.4, x: 2.6, z: 2.2, rot: 0, color: '#b88d62' },
    { id: 'tv', kind: 'tv', name: 'TV unit', w: 1.8, d: 0.4, h: 0.45, x: 2.2, z: 0.25, rot: 0, color: '#b88d62' },
    { id: 'sh', kind: 'shelf', name: 'Shelf', w: 1.0, d: 0.35, h: 1.9, x: 4.95, z: 1.2, rot: -90, color: '#b88d62' }] };
  if (name === 'study') return { room: { w: 3.2, d: 3.0, doors: [{ wall: 'S', c: 2.5, wd: 0.9 }], windows: [{ wall: 'N', c: 1.6, wd: 1.2, sill: 0.9, h: 1.3 }] }, wall: '#b9c1ac', floor: 'oak', items: [
    { id: 'rug', kind: 'rug', name: 'Rug', w: 1.8, d: 1.3, h: 0.02, x: 1.6, z: 1.7, rot: 0, flat: 1, color: '#d9cdb8' },
    { id: 'dk', kind: 'desk', name: 'Desk', w: 1.4, d: 0.65, h: 0.75, x: 1.6, z: 0.4, rot: 0, color: '#b88d62' },
    { id: 'sh', kind: 'shelf', name: 'Shelf', w: 1.1, d: 0.35, h: 2.0, x: 3.0, z: 1.8, rot: -90, color: '#b88d62' },
    { id: 's1', kind: 'sofa', name: 'Armchair', w: 0.9, d: 0.85, h: 0.8, x: 0.6, z: 2.5, rot: 150, color: '#b0765a' }] };
  return { room: { w: 4.0, d: 3.5, doors: [{ wall: 'E', c: 2.9, wd: 0.9 }], windows: [{ wall: 'N', c: 2.0, wd: 1.4, sill: 0.9, h: 1.3 }] }, wall: '#efe9e0', floor: 'oak', items: [
    { id: 'rug', kind: 'rug', name: 'Rug', w: 2.2, d: 1.5, h: 0.02, x: 2.05, z: 1.7, rot: 0, flat: 1, color: '#d9cdb8', off: 1 },
    { id: 'bed', kind: 'bed', name: 'Bed', w: 1.6, d: 1.9, h: 1.0, x: 1.95, z: 0.95, rot: 0, group: 'bed', color: '#a6ad9b' },
    { id: 'ns1', kind: 'nightstand', name: 'Nightstand', w: 0.5, d: 0.4, h: 0.5, x: 0.85, z: 0.2, rot: 0, group: 'bed', edge: 1, color: '#b88d62' },
    { id: 'ns2', kind: 'nightstand', name: 'Nightstand', w: 0.5, d: 0.4, h: 0.5, x: 3.05, z: 0.2, rot: 0, group: 'bed', edge: 1, color: '#b88d62' },
    { id: 'ward', kind: 'wardrobe', name: 'Wardrobe', w: 1.8, d: 0.6, h: 2.1, x: 0.3, z: 2.6, rot: 90, edge: 1, color: '#d6cdbf' },
    { id: 'desk', kind: 'desk', name: 'Desk', w: 1.1, d: 0.6, h: 0.75, x: 2.7, z: 3.0, rot: 180, group: 'desk', edge: 1, color: '#b88d62' }] };
}

/* ───────── pure engine ───────── */
function rectOf(it) {
  const r = it.rot * D2R, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  const W = it.w * c + it.d * s, D = it.w * s + it.d * c;
  return { x0: it.x - W / 2, x1: it.x + W / 2, z0: it.z - D / 2, z1: it.z + D / 2 };
}
const solid = (i) => !i.flat;
const hit = (a, b, p = 0) => a.x0 < b.x1 - p && a.x1 > b.x0 + p && a.z0 < b.z1 - p && a.z1 > b.z0 + p;
function swingRect(room, d) {
  const h = d.wd / 2;
  if (d.wall === 'W') return { x0: 0, x1: d.wd, z0: d.c - h, z1: d.c + h };
  if (d.wall === 'E') return { x0: room.w - d.wd, x1: room.w, z0: d.c - h, z1: d.c + h };
  if (d.wall === 'N') return { z0: 0, z1: d.wd, x0: d.c - h, x1: d.c + h };
  return { z0: room.d - d.wd, z1: room.d, x0: d.c - h, x1: d.c + h };
}
function gapsOf(room, items) {
  const obs = items.filter(solid).map((i) => ({ r: rectOf(i), g: i.group || i.id, id: i.id, edge: i.edge }));
  const big = 50, W = room.w, D = room.d;
  const walls = [{ r: { x0: -big, x1: 0, z0: -big, z1: big }, g: 'w', id: 'w', wall: 1 }, { r: { x0: W, x1: big, z0: -big, z1: big }, g: 'w', id: 'w', wall: 1 },
    { r: { x0: -big, x1: big, z0: -big, z1: 0 }, g: 'w', id: 'w', wall: 1 }, { r: { x0: -big, x1: big, z0: D, z1: big }, g: 'w', id: 'w', wall: 1 }];
  const out = [];
  const pair = (a, b) => {
    if (a.g === b.g) return;
    if (a.edge && b.wall) return; if (b.edge && a.wall) return;
    const oz = Math.min(a.r.z1, b.r.z1) - Math.max(a.r.z0, b.r.z0), gx = Math.max(a.r.x0 - b.r.x1, b.r.x0 - a.r.x1);
    if (oz > 0.1 && gx > 0.02 && gx < 1.3) { const xa = Math.min(a.r.x1, b.r.x1), xb = Math.max(a.r.x0, b.r.x0); out.push({ gap: gx, axis: 'x', a: a.id, b: b.id, x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: Math.max(a.r.z0, b.r.z0), z1: Math.min(a.r.z1, b.r.z1) }); }
    const ox = Math.min(a.r.x1, b.r.x1) - Math.max(a.r.x0, b.r.x0), gz = Math.max(a.r.z0 - b.r.z1, b.r.z0 - a.r.z1);
    if (ox > 0.1 && gz > 0.02 && gz < 1.3) { const za = Math.min(a.r.z1, b.r.z1), zb = Math.max(a.r.z0, b.r.z0); out.push({ gap: gz, axis: 'z', a: a.id, b: b.id, z0: Math.min(za, zb), z1: Math.max(za, zb), x0: Math.max(a.r.x0, b.r.x0), x1: Math.min(a.r.x1, b.r.x1) }); }
  };
  for (let i = 0; i < obs.length; i++) { for (let j = i + 1; j < obs.length; j++) pair(obs[i], obs[j]); walls.forEach((w) => pair(obs[i], w)); }
  return out;
}
function check(room, items) {
  const gaps = gapsOf(room, items), min = (l) => l.reduce((m, g) => Math.min(m, g.gap), 1.5);
  const rd = (v) => Math.round(v * 100) / 100;
  const nar = gaps.slice().sort((a, b) => a.gap - b.gap)[0];
  const walkG = min(gaps), bed = items.find((i) => i.id === 'bed'), ward = items.find((i) => i.id === 'ward');
  const sides = bed ? min(gaps.filter((g) => g.axis === 'x' && (g.a === 'bed' || g.b === 'bed'))) : 1.5;
  const stor = ward ? min(gaps.filter((g) => g.a === 'ward' || g.b === 'ward')) : 1.5;
  const sw = room.doors.map((d) => swingRect(room, d));
  const doorBlock = items.filter(solid).find((i) => sw.some((s) => hit(rectOf(i), s, 0.01)));
  const win = room.windows[0], wz = win ? { x0: win.c - win.wd / 2, x1: win.c + win.wd / 2, z0: 0, z1: 0.8 } : null;
  const lightBlock = wz && items.filter(solid).find((i) => i.h > 1.2 && hit(rectOf(i), wz, 0.01));
  const st = (v, a, b) => (rd(v) >= a ? 'pass' : rd(v) >= b ? 'tight' : 'fail');
  const rules = [
    { id: 'walk', status: st(walkG, 0.9, 0.6), cm: Math.round(walkG * 100), need: 90, w: 10 },
    { id: 'door', status: doorBlock ? 'fail' : 'pass', item: doorBlock && doorBlock.name, w: 8 },
    { id: 'bed', status: bed ? st(sides, 0.6, 0.6) : 'pass', cm: Math.round(sides * 100), need: 60, w: 6 },
    { id: 'stor', status: ward ? st(stor, 0.6, 0.6) : 'pass', cm: Math.round(stor * 100), need: 60, w: 6 },
    { id: 'light', status: lightBlock ? 'fail' : 'pass', w: 5 }];
  let pen = 0; rules.forEach((r) => { pen += r.status === 'fail' ? r.w : r.status === 'tight' ? r.w / 2 : 0; });
  const nc = Math.round(walkG * 100);
  return { score: Math.max(0, Math.round(100 - pen * 1.4 - (nc < 100 ? 3 : 0))), rules, narrow: nar ? { cm: Math.round(nar.gap * 100), gap: nar } : null, gaps };
}
function valid(room, items, moved) {
  const W = room.w, D = room.d;
  for (const m of moved) { const r = rectOf(m); if (r.x0 < -0.001 || r.z0 < -0.001 || r.x1 > W + 0.001 || r.z1 > D + 0.001) return false; if (m.flat) continue; for (const o of items) if (o !== m && solid(o) && !moved.includes(o) && hit(r, rectOf(o), 0.005)) return false; }
  return true;
}
function groupsOf(items) { const g = {}; items.forEach((i) => { if (i.locked || i.flat) return; (g[i.group || i.id] = g[i.group || i.id] || []).push(i); }); return g; }
function optimize(room, src, avoid = []) {
  const items = src.map((i) => ({ ...i })); const moves = []; const used = [];
  const val = (its) => { const c = check(room, its); return c.score * 100 + Math.min(c.narrow ? c.narrow.cm : 150, 120); };
  let cur = val(items);
  for (let step = 0; step < 3; step++) {
    let best = null; const groups = groupsOf(items);
    for (const gk in groups) {
      if (avoid.includes(gk) || used.includes(gk)) continue;
      const mem = groups[gk], base = mem.map((m) => [m.x, m.z]);
      for (let dx = -1.2; dx <= 1.2001; dx += 0.05) for (let dz = -1.2; dz <= 1.2001; dz += 0.05) {
        if (Math.abs(dx) < 0.01 && Math.abs(dz) < 0.01) continue;
        mem.forEach((m, k) => { m.x = Math.round((base[k][0] + dx) * 100) / 100; m.z = Math.round((base[k][1] + dz) * 100) / 100; });
        if (!valid(room, items, mem)) continue;
        const v = val(items) - 12 * Math.hypot(dx, dz);
        if (!best || v > best.v) best = { v, gk, dx, dz };
      }
      mem.forEach((m, k) => { m.x = base[k][0]; m.z = base[k][1]; });
    }
    if (!best || best.v <= cur + 0.5) break;
    groups[best.gk].forEach((m) => { m.x = Math.round((m.x + best.dx) * 100) / 100; m.z = Math.round((m.z + best.dz) * 100) / 100; });
    used.push(best.gk); cur = val(items);
    groups[best.gk].forEach((m) => moves.push({ id: m.id, x: m.x, z: m.z, rot: m.rot, group: best.gk, name: m.name, dx: best.dx, dz: best.dz }));
  }
  return { moves, groups: used, after: check(room, items) };
}
function largestFree(room, items) {
  const s = 0.1, nx = Math.round(room.w / s), nz = Math.round(room.d / s), g = [];
  const rs = items.filter(solid).map(rectOf);
  for (let i = 0; i < nx; i++) { g[i] = []; for (let j = 0; j < nz; j++) { const c = { x0: i * s + 0.01, x1: (i + 1) * s - 0.01, z0: j * s + 0.01, z1: (j + 1) * s - 0.01 }; g[i][j] = !rs.some((r) => hit(c, r)); } }
  let best = { a: 0, w: 0, d: 0 };
  for (let i0 = 0; i0 < nx; i0++) for (let j0 = 0; j0 < nz; j0++) { let maxj = nz; for (let i = i0; i < nx && g[i][j0]; i++) { let j = j0; while (j < maxj && g[i][j]) j++; maxj = Math.min(maxj, j); const w = (i - i0 + 1) * s, d = (maxj - j0) * s; if (w * d > best.a) best = { a: w * d, w, d }; } }
  return best;
}

/* ───────── models ───────── */
function rbox(w, h, d, r, mat, bev) {
  const b = Math.min(bev == null ? 0.012 : bev, h / 3, w / 3, d / 3), ww = w - 2 * b, dd = d - 2 * b; r = Math.max(0.002, Math.min(r, ww / 2 - 0.001, dd / 2 - 0.001));
  const s = new T.Shape(), x = -ww / 2, y = -dd / 2;
  s.moveTo(x + r, y); s.lineTo(x + ww - r, y); s.quadraticCurveTo(x + ww, y, x + ww, y + r); s.lineTo(x + ww, y + dd - r); s.quadraticCurveTo(x + ww, y + dd, x + ww - r, y + dd); s.lineTo(x + r, y + dd); s.quadraticCurveTo(x, y + dd, x, y + dd - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, b, 0);
  const m = new T.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const bx = (w, h, d, mat, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = true; m.position.set(x, y + h / 2, z); return m; };
const LINEN = M('#ece6da', 0.95), LINEN2 = M('#d9d1c3', 0.95), DARK = M('#3b3a38', 0.6), BRASS = M('#b68235', 0.35, 0.7), WOOD = M('#b88d62', 0.7);
let blobTex;
function blob() { if (blobTex) return blobTex; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.filter = 'blur(9px)'; x.fillStyle = '#000'; x.fillRect(28, 28, 72, 72); blobTex = new T.CanvasTexture(c); return blobTex; }
function build(it) {
  const g = new T.Group(), main = M(it.color, 0.8), w = it.w, d = it.d, h = it.h; g.userData.main = [main];
  const k = it.kind;
  if (k === 'bed') {
    const fab = main;
    g.add(rbox(w, 0.22, d, 0.03, WOOD)); g.add(at(rbox(w - 0.06, 0.2, d - 0.16, 0.07, LINEN), 0, 0.2, 0.05));
    g.add(at(rbox(w - 0.02, 0.07, d * 0.62, 0.05, M('#cfc6b6', 0.95)), 0, 0.38, d / 2 - 0.05 - d * 0.31));
    g.add(at(rbox(w + 0.04, 1.0, 0.1, 0.035, fab), 0, 0, -d / 2 + 0.05));
    [-1, 1].forEach((s) => g.add(at(rbox(w / 2 - 0.1, 0.13, 0.42, 0.06, LINEN), s * w / 4, 0.4, -d / 2 + 0.38)));
  } else if (k === 'nightstand') {
    g.add(rbox(w, h, d, 0.02, main)); g.add(bx(w - 0.08, 0.012, 0.006, DARK, 0, h * 0.5, d / 2 + 0.002)); g.add(bx(0.07, 0.012, 0.02, BRASS, 0, h * 0.75, d / 2 + 0.01)); g.add(bx(0.07, 0.012, 0.02, BRASS, 0, h * 0.25, d / 2 + 0.01));
  } else if (k === 'wardrobe') {
    g.add(rbox(w, h, d, 0.015, main)); g.add(bx(w - 0.02, 0.06, 0.004, M('#000', 1), 0, 0, d / 2 + 0.001));
    g.add(bx(0.006, h - 0.14, 0.004, DARK, 0, 0.07, d / 2 + 0.002)); [-1, 1].forEach((s) => g.add(bx(0.012, 0.35, 0.02, BRASS, s * 0.05, h * 0.5, d / 2 + 0.012)));
    g.add(bx(0.006, h - 0.14, 0.004, DARK, -w / 4, 0.07, d / 2 + 0.002)); g.add(bx(0.006, h - 0.14, 0.004, DARK, w / 4, 0.07, d / 2 + 0.002));
  } else if (k === 'desk') {
    g.add(at(rbox(w, 0.04, d, 0.012, main), 0, 0.71, 0)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(bx(0.04, 0.71, 0.04, DARK, a * (w / 2 - 0.05), 0, b * (d / 2 - 0.05))));
    g.add(bx(0.32, 0.012, 0.22, M('#a9a7a3', 0.4, 0.6), 0, 0.75, -0.05)); const sc = bx(0.32, 0.21, 0.008, DARK, 0, 0, 0); sc.position.set(0, 0.87, -0.16); sc.rotation.x = -0.12; g.add(sc);
    const cz = d / 2 + 0.3; g.add(at(rbox(0.44, 0.06, 0.44, 0.05, LINEN2), 0, 0.42, cz)); g.add(at(rbox(0.42, 0.42, 0.05, 0.04, LINEN2), 0, 0.46, cz + 0.2)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(bx(0.025, 0.42, 0.025, DARK, a * 0.18, 0, cz + b * 0.18)));
  } else if (k === 'rug') {
    g.add(rbox(w, 0.016, d, 0.02, main, 0.004)); g.children[0].castShadow = false;
  } else if (k === 'sofa') {
    g.add(rbox(w, 0.38, d, 0.06, main)); g.add(at(rbox(w, 0.46, 0.24, 0.08, main), 0, 0.3, -d / 2 + 0.12)); [-1, 1].forEach((s) => g.add(at(rbox(0.2, 0.3, d - 0.2, 0.06, main), s * (w / 2 - 0.1), 0.3, 0.1)));
    const n = w > 2 ? 3 : w > 1.2 ? 2 : 1, cw = (w - 0.4) / n; for (let i = 0; i < n; i++) g.add(at(rbox(cw - 0.02, 0.14, d - 0.34, 0.06, main), -w / 2 + 0.2 + cw * (i + 0.5), 0.38, 0.09));
  } else if (k === 'table') {
    g.add(at(rbox(w, 0.04, d, 0.02, main), 0, h - 0.04, 0)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(bx(0.04, h - 0.04, 0.04, DARK, a * (w / 2 - 0.06), 0, b * (d / 2 - 0.06))));
  } else if (k === 'tv') {
    g.add(rbox(w, h, d, 0.02, main)); g.add(bx(w * 0.7, 0.62, 0.035, DARK, 0, h + 0.04, 0)); g.add(bx(0.3, 0.04, 0.12, DARK, 0, h, 0));
  } else if (k === 'lamp') {
    const cy = (r1, r2, hh, mat, y) => { const m = new T.Mesh(new T.CylinderGeometry(r1, r2, hh, 24), mat); m.castShadow = true; m.position.y = y + hh / 2; return m; };
    g.add(cy(0.14, 0.15, 0.025, DARK, 0)); g.add(cy(0.012, 0.012, 1.2, BRASS, 0.025)); g.add(cy(0.1, 0.17, 0.28, new T.MeshStandardMaterial({ color: '#f3e9d6', emissive: '#ffd9a0', emissiveIntensity: 0.35, roughness: 0.9, side: T.DoubleSide }), 1.2));
  } else if (k === 'shelf') {
    g.add(rbox(w, h, d, 0.01, main)); for (let i = 1; i < 5; i++) g.add(bx(w - 0.04, 0.012, 0.005, LINEN2, 0, h * i / 5, d / 2 + 0.002));
  }
  if (!it.flat) { const sh = new T.Mesh(new T.PlaneGeometry(w + 0.35, d + 0.35), new T.MeshBasicMaterial({ map: blob(), transparent: true, opacity: 0.42, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; sh.renderOrder = 1; g.add(sh); }
  return g;
}

/* ───────── textures ───────── */
function floorTex(room, key) {
  const ppm = 200, c = document.createElement('canvas'); c.width = Math.round(room.w * ppm); c.height = Math.round(room.d * ppm); const x = c.getContext('2d');
  const base = FLOORS[key] || FLOORS.oak; x.fillStyle = base; x.fillRect(0, 0, c.width, c.height);
  if (key === 'oak' || key === 'walnut' || key === 'ash') {
    const ph = 0.14 * ppm; let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let j = 0; j * ph < c.height; j++) { let u = -rnd() * 0.9 * ppm; while (u < c.width) { const len = (0.9 + rnd() * 0.9) * ppm; x.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,' + rnd() * 0.07 + ')' : 'rgba(0,0,0,' + rnd() * 0.07 + ')'; x.fillRect(u, j * ph, len, ph); x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(u, j * ph, 1.2, ph); u += len; } x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, j * ph, c.width, 1.2); }
  } else if (key === 'stone') { x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 1.5; for (let u = 0; u < c.width; u += 0.6 * ppm) { x.beginPath(); x.moveTo(u, 0); x.lineTo(u, c.height); x.stroke(); } for (let v = 0; v < c.height; v += 0.6 * ppm) { x.beginPath(); x.moveTo(0, v); x.lineTo(c.width, v); x.stroke(); } }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* ───────── controller ───────── */
function create(host, opts = {}) {
  const P = preset(opts.preset), room = JSON.parse(JSON.stringify(P.room));
  let items = P.items.filter((i) => !i.off).map((i) => ({ ...i }));
  let wallCol = P.wall, floorKey = P.floor;
  const L = { dig: (s) => s, narrowest: 'Narrowest', locked: 'Locked', cm: 'cm', m: 'm' };
  const W0 = opts.w, H0 = opts.h;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92; renderer.setClearColor(0x000000, 0);
  const dom = renderer.domElement; dom.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none';
  dom.addEventListener('webglcontextlost', (e) => e.preventDefault()); dom.addEventListener('webglcontextrestored', () => { dirty = true; });
  host.style.position = host.style.position || 'relative'; host.style.overflow = 'hidden'; host.appendChild(dom);
  const ov = document.createElement('div'); ov.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;font:600 11px/1 var(--fb,Lora,serif);font-variant-numeric:tabular-nums'; host.appendChild(ov);

  const scene = new T.Scene(), world = new T.Group(); scene.add(world);
  scene.add(new T.HemisphereLight(0xfff3e4, 0xd0c7b9, 0.75));
  const sun = new T.DirectionalLight(0xffeedd, 2.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 20; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
  const fill = new T.DirectionalLight(0xdfe8ff, 0.3); fill.position.set(-4, 5, -3); scene.add(fill);
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, -50, 50);
  let az = 38 * D2R, el = 33 * D2R, zoom = 1, view = opts.view || '3d', tAz = az, tEl = el, tZoom = zoom, pad = opts.pad || 0, W = 300, Hh = 300;
  let dirty = true, visible = true, walk = !!opts.walk, selId = null, disposed = false, lastCheck = null, dims = !!opts.dims;
  const mats = { wall: M(wallCol, 1), floor: new T.MeshStandardMaterial({ roughness: 0.75 }), glass: new T.MeshStandardMaterial({ color: '#dfeaf2', transparent: true, opacity: 0.35, roughness: 0.1 }), slab: M('#ddd7cc', 1), frame: M('#f6f2ea', 0.8) };
  const walls = {}, fixed = new T.Group(), floorG = new T.Group(); world.add(floorG, fixed);
  let walkMesh = null, walkTex = null, selG = null, swing = [];

  function wallGroup(wk) {
    const g = new T.Group(); const len = wk === 'N' || wk === 'S' ? room.w : room.d, ext = wk === 'N' || wk === 'S' ? WT : 0;
    const U = (c) => (wk === 'N' ? c : wk === 'S' ? room.w - c : wk === 'W' ? room.d - c : c);
    const ops = []; room.doors.filter((d) => d.wall === wk).forEach((d) => ops.push({ u: U(d.c), wd: d.wd, y0: 0, y1: 2.1, door: 1 })); room.windows.filter((d) => d.wall === wk).forEach((d) => ops.push({ u: U(d.c), wd: d.wd, y0: d.sill, y1: d.sill + d.h }));
    ops.sort((a, b) => a.u - b.u); let cur = -ext; const add = (a, b, y0, y1) => { if (b - a < 0.001) return; const m = new T.Mesh(new T.BoxGeometry(b - a, y1 - y0, WT), mats.wall); m.position.set((a + b) / 2, (y0 + y1) / 2, -WT / 2); m.castShadow = m.receiveShadow = true; g.add(m); };
    ops.forEach((o) => { const a = o.u - o.wd / 2, b = o.u + o.wd / 2; add(cur, a, 0, H); add(a, b, 0, o.y0); add(a, b, o.y1, H); if (!o.door) { const gl = new T.Mesh(new T.PlaneGeometry(o.wd, o.y1 - o.y0), mats.glass); gl.position.set(o.u, (o.y0 + o.y1) / 2, -WT / 2); g.add(gl); [[o.u, o.y0 - 0.01, o.wd + 0.06, 0.04], [o.u, o.y1 + 0.01, o.wd + 0.06, 0.04]].forEach(([u, y, ww, hh]) => { const f = new T.Mesh(new T.BoxGeometry(ww, hh, WT + 0.04), mats.frame); f.position.set(u, y, -WT / 2); g.add(f); }); const mu = new T.Mesh(new T.BoxGeometry(0.03, o.y1 - o.y0, 0.05), mats.frame); mu.position.set(o.u, (o.y0 + o.y1) / 2, -WT / 2); g.add(mu); } cur = b; });
    add(cur, len + ext, 0, H);
    if (wk === 'N') g.position.set(0, 0, 0); if (wk === 'S') { g.position.set(room.w, 0, room.d); g.rotation.y = Math.PI; } if (wk === 'W') { g.position.set(0, 0, room.d); g.rotation.y = Math.PI / 2; } if (wk === 'E') { g.position.set(room.w, 0, 0); g.rotation.y = -Math.PI / 2; }
    g.userData = { out: { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[wk], s: 1 }; return g;
  }
  function clearG(g) { while (g.children.length) { const c = g.children.pop(); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } }
  function buildRoom() {
    clearG(fixed); clearG(floorG); Object.keys(walls).forEach((k) => delete walls[k]); swing = [];
    const fl = new T.Mesh(new T.PlaneGeometry(room.w, room.d), mats.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(room.w / 2, 0.0, room.d / 2); fl.receiveShadow = true; floorG.add(fl);
    const sl = new T.Mesh(new T.BoxGeometry(room.w + 2 * WT, 0.1, room.d + 2 * WT), mats.slab); sl.position.set(room.w / 2, -0.051, room.d / 2); sl.receiveShadow = true; floorG.add(sl);
    setFloor(floorKey, true);
    ['N', 'S', 'W', 'E'].forEach((wk) => { walls[wk] = wallGroup(wk); fixed.add(walls[wk]); });
    room.doors.forEach((d) => {
      const o = { W: { h: [0, d.c + d.wd / 2], v: [0, -1], n: [1, 0] }, E: { h: [room.w, d.c - d.wd / 2], v: [0, 1], n: [-1, 0] }, N: { h: [d.c - d.wd / 2, 0], v: [1, 0], n: [0, 1] }, S: { h: [d.c + d.wd / 2, room.d], v: [-1, 0], n: [0, -1] } }[d.wall];
      const hx = d.wall === 'W' || d.wall === 'E' ? o.h[0] : o.h[0], hz = d.wall === 'W' || d.wall === 'E' ? o.h[1] : o.h[1];
      const dir = new T.Vector2(o.v[0] * 0.2 + o.n[0] * 0.98, o.v[1] * 0.2 + o.n[1] * 0.98).normalize(); const pv = new T.Group(); pv.position.set(hx, 0, hz); pv.rotation.y = Math.atan2(dir.x, dir.y);
      const lf = new T.Mesh(new T.BoxGeometry(0.04, 2.08, d.wd - 0.02), M('#f4efe6', 0.7)); lf.position.set(0, 1.04, d.wd / 2); lf.castShadow = true; pv.add(lf); fixed.add(pv); pv.userData.wall = d.wall; swing.push(pv);
      const pts = [new T.Vector3(hx, 0.006, hz)]; for (let a = 0; a <= 20; a++) { const f = (a / 20) * Math.PI / 2; pts.push(new T.Vector3(hx + d.wd * (Math.cos(f) * o.v[0] + Math.sin(f) * o.n[0]), 0.006, hz + d.wd * (Math.cos(f) * o.v[1] + Math.sin(f) * o.n[1]))); }
      const pos = []; for (let i = 1; i < pts.length - 1; i++) pos.push(pts[0].x, pts[0].y, pts[0].z, pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); fixed.add(new T.Mesh(gg, new T.MeshBasicMaterial({ color: 0xb68235, transparent: true, opacity: 0.1, depthWrite: false, side: T.DoubleSide })));
      fixed.add(new T.Line(new T.BufferGeometry().setFromPoints(pts.slice(1)), new T.LineBasicMaterial({ color: 0xb68235, transparent: true, opacity: 0.55 })));
    });
    sun.position.set(room.w / 2 + 3.5, 6.5, room.d / 2 + 2.6); sun.target.position.set(room.w / 2, 0, room.d / 2);
    buildWalk(); dirty = true;
  }
  function setFloor(k, quiet) { floorKey = k; if (mats.floor.map) mats.floor.map.dispose(); mats.floor.map = floorTex(room, k); mats.floor.needsUpdate = true; dirty = true; }
  function setWall(c) { wallCol = c; mats.wall.color.set(c); dirty = true; }
  function buildWalk() { if (walkMesh) { world.remove(walkMesh); walkMesh.geometry.dispose(); } const c = document.createElement('canvas'); c.width = Math.round(room.w / 0.05); c.height = Math.round(room.d / 0.05); walkTex = new T.CanvasTexture(c); walkTex.magFilter = T.LinearFilter; walkMesh = new T.Mesh(new T.PlaneGeometry(room.w, room.d), new T.MeshBasicMaterial({ map: walkTex, transparent: true, depthWrite: false })); walkMesh.rotation.x = -Math.PI / 2; walkMesh.position.set(room.w / 2, 0.012, room.d / 2); walkMesh.renderOrder = 2; walkMesh.visible = walk; world.add(walkMesh); drawWalk(); }
  function drawWalk() {
    if (!walkTex) return; const c = walkTex.image, x = c.getContext('2d'), s = 0.05, nx = c.width, nz = c.height; x.clearRect(0, 0, nx, nz);
    const rs = items.filter(solid).map(rectOf), free = (px, pz) => !rs.some((r) => px > r.x0 && px < r.x1 && pz > r.z0 && pz < r.z1);
    const run = (i, j, di, dj) => { let a = 0, b = 0, ii = i, jj = j; while (ii >= 0 && jj >= 0 && ii < nx && jj < nz && free((ii + 0.5) * s, (jj + 0.5) * s) && a < 40) { ii -= di; jj -= dj; a++; } ii = i; jj = j; while (ii >= 0 && jj >= 0 && ii < nx && jj < nz && free((ii + 0.5) * s, (jj + 0.5) * s) && b < 40) { ii += di; jj += dj; b++; } return (a + b - 1) * s; };
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { if (!free((i + 0.5) * s, (j + 0.5) * s)) continue; if (Math.min(run(i, j, 1, 0), run(i, j, 0, 1)) >= 0.89) { x.fillStyle = 'rgba(182,130,53,.26)'; x.fillRect(i, j, 1, 1); } }
    const ch = check(room, items); ch.gaps.filter((g) => g.gap < 0.895).forEach((g) => { x.fillStyle = 'rgba(160,72,40,.5)'; const r = g.axis === 'x' ? [g.x0, g.z0, g.x1 - g.x0, g.z1 - g.z0] : [g.x0, g.z0, g.x1 - g.x0, g.z1 - g.z0]; x.fillRect(r[0] / s, r[1] / s, Math.max(1, r[2] / s), Math.max(1, r[3] / s)); });
    walkTex.needsUpdate = true;
  }

  /* items */
  function place(it) { if (it.obj) { world.remove(it.obj); } it.obj = build(it); it.obj.userData.id = it.id; it.obj.traverse((o) => { o.userData.id = it.id; }); it.tx = it.x; it.tz = it.z; it.trot = it.rot; world.add(it.obj); sync(it); }
  function sync(it) { it.obj.position.set(it.x, 0, it.z); it.obj.rotation.y = it.rot * D2R; }
  function rebuildItems() { items.forEach(place); }
  const find = (id) => items.find((i) => i.id === id);
  function emit() { lastCheck = check(room, items); if (walk) drawWalk(); opts.onChange && opts.onChange(lastCheck, selId && find(selId)); dirty = true; }
  let emitQ = 0; const emitSoon = () => { if (!emitQ) emitQ = requestAnimationFrame(() => { emitQ = 0; if (!disposed) emit(); }); };
  function commit(label) { emit(); opts.onCommit && opts.onCommit(label); }

  /* selection overlay */
  function drawSel() {
    if (selG) { world.remove(selG); selG.traverse((o) => o.geometry && o.geometry.dispose()); selG = null; }
    const it = selId && find(selId); if (!it) return; const r = it.rot * D2R, c = Math.cos(r), s = Math.sin(r), hw = it.w / 2 + 0.02, hd = it.d / 2 + 0.02;
    const co = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => new T.Vector3(a * c + b * s, 0.02, -a * s + b * c));
    selG = new T.Group(); const col = it.locked ? 0x7d7979 : it.blocked ? 0xa04828 : 0xb68235; selG.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(co), new T.LineBasicMaterial({ color: col })));
    const pl = new T.Mesh(new T.PlaneGeometry(hw * 2, hd * 2), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.14, depthWrite: false })); pl.rotation.x = -Math.PI / 2; pl.rotation.z = r; pl.position.y = 0.018; selG.add(pl);
    selG.position.set(it.x, 0, it.z); world.add(selG);
  }
  function select(id) { selId = id; const it = id && find(id); drawSel(); opts.onSelect && opts.onSelect(it ? { ...it, obj: undefined } : null); emitSoon(); dirty = true; }

  /* overlays */
  const mk = (css) => { const e = document.createElement('div'); e.style.cssText = 'position:absolute;white-space:nowrap;transform:translate(-50%,-50%);' + css; ov.appendChild(e); return e; };
  const pill = 'padding:5px 9px;border-radius:99px;background:rgba(243,242,242,.92);border:1px solid rgba(32,31,29,.16);color:#201f1d;';
  const narrowEl = mk(pill + 'display:none;'), selEl = mk(pill + 'display:none;font-weight:400;'), knob = mk('width:34px;height:34px;border-radius:50%;background:#f3f2f2;border:1px solid #b68235;display:none;pointer-events:auto;cursor:grab;touch-action:none;'); knob.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#a06f24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8.5A6 6 0 1 0 18 12"/><path d="M18 4v4.5h-4.5"/></svg>';
  const dimEls = {}; ['N', 'S', 'W', 'E'].forEach((k) => { const e = mk(pill + 'display:none;pointer-events:auto;cursor:pointer;touch-action:none;'); e.onclick = (ev) => { ev.stopPropagation(); opts.onDim && opts.onDim(k); }; dimEls[k] = e; });
  const proj = (x, y, z) => { const v = new T.Vector3(x, y, z).project(cam); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * Hh]; };
  function overlays() {
    const nr = lastCheck && lastCheck.narrow; narrowEl.style.display = walk && nr && nr.cm < 90 ? 'block' : 'none';
    if (walk && nr && nr.cm < 90) { const g = nr.gap, [px, py] = proj((g.x0 + g.x1) / 2, 0.05, (g.z0 + g.z1) / 2); narrowEl.style.left = px + 'px'; narrowEl.style.top = py + 'px'; narrowEl.style.borderColor = '#a04828'; narrowEl.style.color = '#7c2f14'; narrowEl.textContent = L.narrowest + ' ' + L.dig(String(nr.cm)) + ' ' + L.cm; }
    const it = selId && find(selId); selEl.style.display = knob.style.display = it ? 'block' : 'none';
    if (it) { const [px, py] = proj(it.x, it.h + 0.12, it.z); selEl.style.left = px + 'px'; selEl.style.top = py - 14 + 'px'; selEl.textContent = (it.locked ? L.locked + ' · ' : '') + L.dig(Math.round(it.w * 100) + ' × ' + Math.round(it.d * 100)) + ' ' + L.cm;
      const r = it.rot * D2R, hw = it.w / 2 + 0.14, hd = it.d / 2 + 0.14, c = Math.cos(r), s = Math.sin(r), [kx, ky] = proj(it.x + hw * c + hd * s, 0.02, it.z - hw * s + hd * c); knob.style.left = kx + 'px'; knob.style.top = ky + 'px'; knob.style.display = it.locked ? 'none' : 'block'; }
    Object.keys(dimEls).forEach((k) => { const e = dimEls[k]; e.style.display = dims ? 'block' : 'none'; if (!dims) return; const o = { N: [room.w / 2, 0, 0, -0.3, room.w], S: [room.w / 2, 0, room.d, 0.3, room.w], W: [0, 0, room.d / 2, -0.3, room.d], E: [room.w, 0, room.d / 2, 0.3, room.d] }[k]; const px = k === 'W' || k === 'E' ? o[0] + o[3] : o[0], pz = k === 'W' || k === 'E' ? o[2] : o[2] + o[3]; const [sx, sy] = proj(px, 0, pz); e.style.left = sx + 'px'; e.style.top = sy + 'px'; e.textContent = L.dig(o[4].toFixed(2).replace('.', L.dec || '.')) + ' ' + L.m; });
  }

  /* camera */
  function frame() {
    const dir = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), ctr = new T.Vector3(room.w / 2, 0.5, room.d / 2);
    cam.position.copy(ctr).addScaledVector(dir, 20); cam.lookAt(ctr); cam.up.set(0, 1, 0);
    const asp = W / Hh, plan = el > 1.4; let sz = plan ? Math.max(room.d * 0.5 + 0.55, (room.w * 0.5 + 0.7) / asp) : Math.max((room.w + room.d) * 0.3 + 0.7, ((room.w + room.d) * 0.36 + 0.5) / asp * 0.9);
    sz /= zoom; const sh = (pad / Math.max(Hh, 1)) * sz; cam.left = -sz * asp; cam.right = sz * asp; cam.top = sz - sh; cam.bottom = -sz - sh; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    return dir;
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  let last = performance.now();
  function tick(now) {
    if (disposed) return; requestAnimationFrame(tick); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!visible) return;
    const k = 1 - Math.exp(-dt * 9); let ch = false;
    if (Math.abs(tAz - az) + Math.abs(tEl - el) + Math.abs(tZoom - zoom) > 0.0005) { az = lerp(az, tAz, k); el = lerp(el, tEl, k); zoom = lerp(zoom, tZoom, k); ch = true; }
    const kg = 1 - Math.exp(-dt * 11); items.forEach((it) => { if (it.tx === undefined) return; const dx = it.tx - it.x, dz = it.tz - it.z, dr = it.trot - it.rot; if (Math.abs(dx) + Math.abs(dz) + Math.abs(dr) > 0.0008) { it.x += dx * kg; it.z += dz * kg; it.rot += dr * kg; sync(it); ch = true; if (it.id === selId) drawSel(); if (it.glide) emitSoon(); } else if (dx || dz || dr) { it.x = it.tx; it.z = it.tz; it.rot = it.trot; sync(it); it.glide = 0; ch = true; emitSoon(); if (it.id === selId) drawSel(); } });
    const dir = frame();
    Object.keys(walls).forEach((k2) => { const g = walls[k2], o = g.userData.out; const tgt = el > 1.4 ? 0.03 : (o[0] * dir.x + o[1] * dir.z > 0.18 ? 0.1 : 1); const ns = lerp(g.scale.y, tgt, k); if (Math.abs(ns - g.scale.y) > 0.0004) { g.scale.y = ns; ch = true; } else g.scale.y = tgt; });
    swing.forEach((p) => { p.scale.y = walls[p.userData.wall].scale.y; }); if (ch || dirty) { renderer.render(scene, cam); overlays(); dirty = false; }
  }
  function resize(w, h) { W = w || host.clientWidth || 300; Hh = h || host.clientHeight || 300; renderer.setSize(W, Hh, false); dirty = true; }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null; if (ro && !opts.w) ro.observe(host);
  const io = typeof IntersectionObserver !== 'undefined' && !opts.w ? new IntersectionObserver((e) => { visible = e[0].isIntersecting; dirty = true; }) : null; io && io.observe(host);
  resize(W0, H0);

  /* interaction */
  const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const ptrs = new Map(); let mode = null, dragOff = null, dragIt = null, pinch = 0, moved = 0, lastOk = null;
  const floorPt = (e) => { const r = dom.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); const p = new T.Vector3(); ray.ray.intersectPlane(plane, p); return p; };
  dom.addEventListener('pointerdown', (e) => {
    dom.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); mode = 'pinch'; return; }
    const r = dom.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
    const hs = ray.intersectObjects(items.filter((i) => !i.flat || i.id === selId || true).map((i) => i.obj), true).filter((h) => h.object.userData.id !== undefined && !(find(h.object.userData.id).flat && h.object.material && h.object.material.map === blobTex));
    const h0 = hs.find((h) => { const it = find(h.object.userData.id); return !(it && it.flat) || hs.every((q) => find(q.object.userData.id).flat); });
    if (h0) { const it = find(h0.object.userData.id); select(it.id); if (it.locked) { mode = 'orbit'; opts.onLocked && opts.onLocked(it); return; } dragIt = it; const p = floorPt(e); dragOff = [it.x - p.x, it.z - p.z]; mode = 'drag'; lastOk = [it.x, it.z]; it.tx = undefined; }
    else mode = 'orbit';
  });
  dom.addEventListener('pointermove', (e) => {
    const p0 = ptrs.get(e.pointerId); if (!p0) return; const dx = e.clientX - p0[0], dy = e.clientY - p0[1]; ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved += Math.abs(dx) + Math.abs(dy);
    if (mode === 'pinch' && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); tZoom = zoom = Math.max(0.6, Math.min(2.4, zoom * d / (pinch || d))); pinch = d; dirty = true; return; }
    if (mode === 'orbit') { if (view === '3d') { tAz = az -= dx * 0.008; tEl = el = Math.max(0.2, Math.min(1.15, el + dy * 0.006)); dirty = true; } }
    else if (mode === 'drag' && dragIt) {
      const p = floorPt(e), it = dragIt; let nx = Math.round((p.x + dragOff[0]) * 20) / 20, nz = Math.round((p.z + dragOff[1]) * 20) / 20; const old = [it.x, it.z]; it.x = nx; it.z = nz; let r = rectOf(it);
      if (Math.abs(r.x0) < 0.07) it.x -= r.x0; if (Math.abs(r.x1 - room.w) < 0.07) it.x -= r.x1 - room.w; if (Math.abs(r.z0) < 0.07) it.z -= r.z0; if (Math.abs(r.z1 - room.d) < 0.07) it.z -= r.z1 - room.d;
      if (valid(room, items, [it])) { lastOk = [it.x, it.z]; if (it.blocked) { it.blocked = 0; } } else { it.x = old[0]; it.z = old[1]; if (!it.blocked) { it.blocked = 1; } }
      sync(it); drawSel(); emitSoon(); dirty = true;
      if (it.blocked) { setTimeout(() => { it.blocked = 0; drawSel(); dirty = true; }, 220); }
    }
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (mode === 'drag' && dragIt) { const it = dragIt; it.tx = it.x; it.tz = it.z; it.trot = it.rot; if (moved > 3) { opts.onHaptic && opts.onHaptic('snap'); commit('move'); } } else if (mode === 'orbit' && moved < 4 && ptrs.size === 0) select(null); if (ptrs.size === 0) { mode = null; dragIt = null; } };
  dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
  dom.addEventListener('wheel', (e) => { e.preventDefault(); tZoom = zoom = Math.max(0.6, Math.min(2.4, zoom * Math.exp(-e.deltaY * 0.0012))); dirty = true; }, { passive: false });
  let kn = null; knob.addEventListener('pointerdown', (e) => { e.stopPropagation(); knob.setPointerCapture(e.pointerId); kn = true; });
  knob.addEventListener('pointermove', (e) => { if (!kn) return; const it = find(selId); if (!it) return; const [cx, cy] = proj(it.x, 0, it.z), r = host.getBoundingClientRect(); const a = Math.atan2(e.clientX - r.left - cx, e.clientY - r.top - cy); const base = Math.atan2(1, 1); let ang = Math.round((a / D2R - 45 + 90 * 0) / 15) * 15; ang = ((ang % 360) + 360) % 360; if (ang > 180) ang -= 360; const old = it.rot; it.rot = ang; if (!valid(room, items, [it])) it.rot = old; else if (old !== it.rot) opts.onHaptic && opts.onHaptic('snap'); it.trot = it.rot; sync(it); drawSel(); emitSoon(); dirty = true; });
  knob.addEventListener('pointerup', () => { if (kn) { kn = null; commit('rotate'); } });

  /* api */
  const clone = (i) => { const c = { ...i }; delete c.obj; delete c.tx; delete c.tz; delete c.trot; delete c.glide; delete c.blocked; return c; };
  const api = {
    room, get items() { return items; }, find,
    getState: () => ({ items: items.map(clone), wall: wallCol, floor: floorKey, w: room.w, d: room.d }),
    setState(s, animate) {
      const ids = s.items.map((i) => i.id).join(), cur = items.map((i) => i.id).join();
      if (ids !== cur) { items.forEach((i) => world.remove(i.obj)); items = s.items.map((i) => ({ ...i })); rebuildItems(); }
      else s.items.forEach((n) => { const it = find(n.id); const colChanged = it.color !== n.color; it.locked = n.locked; it.color = n.color; if (colChanged) it.obj.userData.main.forEach((m) => m.color.set(n.color)); if (animate) { it.tx = n.x; it.tz = n.z; it.trot = n.rot; it.glide = 1; } else { it.x = it.tx = n.x; it.z = it.tz = n.z; it.rot = it.trot = n.rot; sync(it); } });
      if (s.wall !== wallCol) setWall(s.wall); if (s.floor !== floorKey) setFloor(s.floor); selId && !find(selId) && select(null); drawSel(); emit();
    },
    select, selected: () => selId && find(selId),
    setView(v) { view = v; if (v === 'plan') { tEl = 1.55; tAz = 0; tZoom = 1; } else { tEl = 33 * D2R; tAz = 38 * D2R; tZoom = 1; } dirty = true; },
    toggleWalk(b) { walk = b; if (walkMesh) walkMesh.visible = b; if (b) drawWalk(); dirty = true; emit(); },
    setDims(b) { dims = b; dirty = true; }, setPad(p) { pad = p; dirty = true; },
    setText(t) { Object.assign(L, t); dirty = true; },
    setWall, setFloor: (k) => { setFloor(k); }, wallCol: () => wallCol, floorKey: () => floorKey,
    glide(list) { list.forEach((m) => { const it = find(m.id); if (!it) return; it.tx = m.x; it.tz = m.z; it.trot = m.rot == null ? it.rot : m.rot; it.glide = 1; }); dirty = true; },
    move(id, x, z, rot) { const it = find(id); it.x = it.tx = x; it.z = it.tz = z; if (rot != null) it.rot = it.trot = rot; sync(it); drawSel(); emit(); },
    rotate(id, deg) { const it = find(id); const old = it.rot; it.rot = it.trot = (((it.rot + deg + 180) % 360) + 360) % 360 - 180; if (!valid(room, items, [it])) { it.rot = it.trot = old; return false; } sync(it); drawSel(); commit('rotate'); return true; },
    setColor(id, c) { const it = find(id); it.color = c; it.obj.userData.main.forEach((m) => m.color.set(c)); dirty = true; commit('color'); },
    setLocked(id, b) { const it = find(id); it.locked = b; drawSel(); commit('lock'); select(id); },
    applyStyle(d) { setWall(d.wall); setFloor(d.floor); items.forEach((it) => { const c = d.items[it.kind]; if (c && !it.locked) { it.color = c; it.obj.userData.main.forEach((m) => m.color.set(c)); } }); dirty = true; emit(); },
    remove(id) { const it = find(id); world.remove(it.obj); items = items.filter((i) => i !== it); selId === id && select(null); commit('remove'); },
    add(kind, def) { const n = (items.filter((i) => i.kind === kind).length + 1); const it = { id: kind + Date.now() % 1e6, kind, name: def.name, w: def.w, d: def.d, h: def.h, x: room.w / 2, z: room.d / 2, rot: 0, color: def.color, flat: def.flat ? 1 : 0 }; if (!it.flat) { const spot = freeSpot(it, def.near); if (!spot) return null; it.x = spot.x; it.z = spot.z; } items.push(it); place(it); select(it.id); commit('add'); return it; },
    check: () => lastCheck || check(room, items), optimize: (avoid) => optimize(room, items, avoid), largestFree: (ex) => largestFree(room, ex ? items.filter((i) => i.id !== ex) : items), commit,
    setRoomSize(w, d) { room.w = w; room.d = d; items.forEach((i) => { const r = rectOf(i); if (r.x1 > w) i.x = i.tx = Math.max(i.w / 2, i.x - (r.x1 - w)); if (r.z1 > d) i.z = i.tz = Math.max(i.d / 2, i.z - (r.z1 - d)); sync(i); }); room.doors.forEach((x) => { const lim = x.wall === 'N' || x.wall === 'S' ? w : d; x.c = Math.min(x.c, lim - x.wd / 2); }); room.windows.forEach((x) => { const lim = x.wall === 'N' || x.wall === 'S' ? w : d; x.c = Math.min(x.c, lim - x.wd / 2); }); buildRoom(); emit(); },
    snapshot(o = {}) { const sv = [view, az, el, zoom, W, Hh, pad], sw = walk, sd = dims; if (o.view) { el = o.view === 'plan' ? 1.55 : 33 * D2R; az = o.view === 'plan' ? 0 : 38 * D2R; zoom = 1; } pad = o.pad || 0; walk = !!o.walk; dims = false; selG && (selG.visible = false); ov.style.display = 'none'; if (o.w) resize(o.w, o.h); Object.values(walls).forEach((g) => { const dir = frame(); const oo = g.userData.out; g.scale.y = el > 1.4 ? 0.03 : (oo[0] * dir.x + oo[1] * dir.z > 0.18 ? 0.1 : 1); }); frame(); renderer.render(scene, cam); const url = dom.toDataURL('image/jpeg', 0.88); [view, az, el, zoom, , , pad] = sv; walk = sw; dims = sd; selG && (selG.visible = true); ov.style.display = ''; resize(); dirty = true; return url; },
    resize, dispose() { disposed = true; ro && ro.disconnect(); io && io.disconnect(); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); host.innerHTML = ''; },
  };
  function freeSpot(it, near) { const cx = near ? near.x : room.w / 2, cz = near ? near.z : room.d / 2; for (let r = 0; r < 40; r++) for (let a = 0; a < 16; a++) { const x = cx + Math.cos(a * Math.PI / 8) * r * 0.1, z = cz + Math.sin(a * Math.PI / 8) * r * 0.1; it.x = x; it.z = z; if (valid(room, items.concat([it]), [it])) return { x: Math.round(x * 20) / 20, z: Math.round(z * 20) / 20 }; } return null; }
  buildRoom(); rebuildItems(); setWall(wallCol); lastCheck = check(room, items); requestAnimationFrame(tick);
  if (opts.onReady) opts.onReady(api);
  return api;
}
const cache = {};
function thumb(name, o = {}) { const key = JSON.stringify([name, o]); if (cache[key]) return cache[key]; const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + (o.w || 560) + 'px;height:' + (o.h || 400) + 'px'; document.body.appendChild(d); const a = create(d, { preset: name, w: o.w || 560, h: o.h || 400, view: o.view }); if (o.state) a.setState(o.state); if (o.view === 'plan') a.setView('plan'); const u = a.snapshot({ view: o.view || '3d', w: o.w || 560, h: o.h || 400, walk: o.walk }); a.dispose(); d.remove(); return (cache[key] = u); }
window.BuildItRoom = { create, thumb, preset, check, optimize, rectOf };
}
if (window.THREE) run(); else if (!window.__biT) { window.__biT = 1; const sc = document.createElement('script'); sc.src = 'https://unpkg.com/three@0.160.0/build/three.min.js'; sc.onload = run; document.head.appendChild(sc); } else { const iv = setInterval(() => { if (window.THREE && !window.BuildItRoom) { clearInterval(iv); run(); } }, 50); }
})();
