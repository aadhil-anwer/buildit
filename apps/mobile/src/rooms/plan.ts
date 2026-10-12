import { roomBounds, typeInfo, type Scene } from "@buildit/core";

/** Where each wall corner and piece lands in a `width` x `height` drawing of the room seen from above, north up. */
export function planGeometry(scene: Scene, width: number, height: number, pad = 12) {
  const b = roomBounds(scene.room);
  const [w, d] = [b.maxX - b.minX, b.maxZ - b.minZ];
  const scale = Math.min((width - 2 * pad) / w, (height - 2 * pad) / d);
  const left = pad + (width - 2 * pad - w * scale) / 2;
  const top = pad + (height - 2 * pad - d * scale) / 2;
  const [px, pz] = [(x: number) => left + (x - b.minX) * scale, (z: number) => top + (z - b.minZ) * scale];
  const items = scene.objects.map((o) => ({
    id: o.id, cx: px(o.x), cy: pz(o.z), w: o.w * scale, d: o.d * scale, color: o.color,
    rotation: -o.rotation, // the scene turns counter-clockwise seen from above; SVG turns clockwise
    flat: !!typeInfo(o.type).floorLevel,
  }));
  const corners = scene.room.corners.map((c) => ({ x: px(c.x), y: pz(c.z) }));
  return { scale, at: (x: number, z: number) => ({ x: px(x), y: pz(z) }), corners, wall: corners.map((c) => `${c.x},${c.y}`).join(" "), items: [...items.filter((i) => i.flat), ...items.filter((i) => !i.flat)] };
}

/** Where to put each wall's label: beside the middle of the wall, on the outside, `offset` away from it. */
export function wallLabels(corners: { x: number; y: number }[], offset = 22) {
  const centre = { x: corners.reduce((s, c) => s + c.x, 0) / corners.length, y: corners.reduce((s, c) => s + c.y, 0) / corners.length };
  return corners.map((c, wall) => {
    const d = corners[(wall + 1) % corners.length];
    const [mx, my, len] = [(c.x + d.x) / 2, (c.y + d.y) / 2, Math.hypot(d.x - c.x, d.y - c.y) || 1];
    const sign = ((d.y - c.y) / len) * (mx - centre.x) - ((d.x - c.x) / len) * (my - centre.y) < 0 ? -1 : 1;
    return { wall, x: mx + (sign * (d.y - c.y) * offset) / len, y: my - (sign * (d.x - c.x) * offset) / len };
  });
}
