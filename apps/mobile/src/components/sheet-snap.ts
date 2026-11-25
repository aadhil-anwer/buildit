export type Snap = "peek" | "half" | "full";

/** Sheet heights in points. Peek is just the tabs and a row, so the room keeps most of the screen; half and full are the design's. */
export const SNAP_HEIGHT: Record<Snap, number> = { peek: 132, half: 404, full: 640 };

/** The grabber cycles peek, half, full, then back to peek. A worklet: the sheet's gestures call it on the UI thread. */
export function nextSnap(snap: Snap): Snap {
  "worklet";
  const order: Snap[] = ["peek", "half", "full"];
  return order[(order.indexOf(snap) + 1) % order.length];
}

/** Heights fitted to the screen, so the tallest never covers the whole of a small phone. */
export const fitHeights = (screenHeight: number, topClearance: number): Record<Snap, number> => {
  const max = Math.max(SNAP_HEIGHT.peek, screenHeight - topClearance);
  return { peek: SNAP_HEIGHT.peek, half: Math.min(SNAP_HEIGHT.half, max), full: Math.min(SNAP_HEIGHT.full, max) };
};

/**
 * Where a drag lands: the height it would reach in 0.2 s at the release velocity (px/s, up is positive), nearest snap.
 * A worklet: the drag ends on the UI thread, and calling a plain JS function there crashes the app on a phone.
 */
export function settleSnap(height: number, velocityUp: number, heights: Record<Snap, number>): Snap {
  "worklet";
  const projected = height + velocityUp * 0.2;
  const order: Snap[] = ["peek", "half", "full"];
  let best: Snap = "peek";
  for (const s of order) if (Math.abs(heights[s] - projected) < Math.abs(heights[best] - projected)) best = s;
  return best;
}
