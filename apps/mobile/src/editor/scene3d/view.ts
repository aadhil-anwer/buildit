import { Vector3 } from "three";

const RAD = Math.PI / 180;

/** The camera's starting angles: seen from the south-east, 33° above the floor (the design's view). */
export const START = { az: 38 * RAD, el: 33 * RAD, zoom: 1 };
const EL_LIMITS = [14 * RAD, 70 * RAD] as const;
const ZOOM_LIMITS = [0.6, 3] as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));
export const clampElevation = (el: number) => clamp(el, EL_LIMITS);
export const clampZoom = (zoom: number) => clamp(zoom, ZOOM_LIMITS);

/** Where the camera stands, `distance` away from `target`, for an azimuth and elevation (radians). */
export const cameraOffset = (az: number, el: number, distance: number) =>
  new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(distance);

/** What to aim at and how far to zoom (pixels per metre) so `points` fill a `width` x `height` view seen from (az, el), centred, with `pad` pixels round the edge. */
export function fitView(points: Vector3[], az: number, el: number, width: number, height: number, pad: number) {
  const back = cameraOffset(az, el, 1);
  const right = new Vector3(0, 1, 0).cross(back).normalize();
  const up = back.clone().cross(right).normalize();
  const [xs, ys] = [points.map((p) => p.dot(right)), points.map((p) => p.dot(up))];
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const zoom = Math.max(1, Math.min((width - 2 * pad) / (x1 - x0), (height - 2 * pad) / (y1 - y0)));
  return { zoom, target: right.multiplyScalar((x0 + x1) / 2).add(up.multiplyScalar((y0 + y1) / 2)) };
}

/** A wall faces the camera when its outward direction points towards where the camera stands; those are hidden so the room can be seen into. */
export const facesCamera = (outward: { x: number; z: number }, az: number) => outward.x * Math.sin(az) + outward.z * Math.cos(az) > 0.15;
