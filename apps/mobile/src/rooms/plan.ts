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
  return { wall: scene.room.corners.map((c) => `${px(c.x)},${pz(c.z)}`).join(" "), items: [...items.filter((i) => i.flat), ...items.filter((i) => !i.flat)] };
}
