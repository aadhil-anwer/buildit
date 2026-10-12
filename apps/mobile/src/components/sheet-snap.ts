const SNAPS = ["peek", "half", "full"] as const;
export type Snap = (typeof SNAPS)[number];

/** The design's sheet heights in points: 196 / 404 / 640. */
export const SNAP_HEIGHT: Record<Snap, number> = { peek: 196, half: 404, full: 640 };

/** The grabber cycles peek, half, full, then back to peek. */
export const nextSnap = (snap: Snap): Snap => SNAPS[(SNAPS.indexOf(snap) + 1) % SNAPS.length];

/** Heights fitted to the screen, so the tallest never covers the whole of a small phone. */
export const fitHeights = (screenHeight: number, topClearance: number): Record<Snap, number> => {
  const max = Math.max(SNAP_HEIGHT.peek, screenHeight - topClearance);
  return { peek: SNAP_HEIGHT.peek, half: Math.min(SNAP_HEIGHT.half, max), full: Math.min(SNAP_HEIGHT.full, max) };
};

/** Where a drag lands: the height it would reach in 0.2 s at the release velocity (px/s, up is positive), nearest snap. */
export const settleSnap = (height: number, velocityUp: number, heights: Record<Snap, number>): Snap => {
  const projected = height + velocityUp * 0.2;
  return SNAPS.reduce((best, s) => (Math.abs(heights[s] - projected) < Math.abs(heights[best] - projected) ? s : best), SNAPS[0]);
};
