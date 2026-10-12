import { generated } from "../../src/i18n/strings.generated.ts";

const DAY = 86_400_000;
const scene = (name: string, w: number, d: number) => ({
  version: 1, id: name,
  room: { name, corners: [{ x: 0, z: 0 }, { x: w, z: 0 }, { x: w, z: d }, { x: 0, z: d }], height: 2.8, openings: [{ id: "door_1", type: "door", wall: 1, offset: d - 1.4, width: 0.9, height: 2.1, sill: 0 }, { id: "window_1", type: "window", wall: 0, offset: w / 2 - 0.7, width: 1.4, height: 1.3, sill: 0.9 }], floorColor: "#cdbca3", wallColor: "#efe9e0" },
  objects: [{ id: "bed_1", catalogId: "bed_queen", type: "bed", name: "Bed", w: 1.7, d: 2.15, h: 1.1, x: w / 2, z: 1.3, rotation: 0, color: "#d8cfc2" }],
  constraints: { minWalkway: 0.8 },
});

/** The three rooms the prototype's My rooms screen shows (same names, sizes and ages), as the persisted store would hold them. */
export function seedRooms(lang: "en" | "ar", now = Date.now()) {
  const s = generated[lang];
  const rooms = [[s.rBed, 4, 3.5, 0], [s.rMaj, 5.2, 4.1, 3], [s.rStudy, 3.2, 3, 8]] as const;
  return JSON.stringify({
    state: { rooms: rooms.map(([name, w, d, daysAgo], i) => ({ id: `seed${i}`, name, scene: scene(name, w, d), updatedAt: now - daysAgo * DAY, dirty: false })) },
    version: 1,
  });
}
