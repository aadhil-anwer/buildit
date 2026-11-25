import { roomCheck, type Scene } from "@buildit/core";
import type { RootState } from "@react-three/fiber";
import { GLView } from "expo-gl";
import { useEffect, type RefObject } from "react";
import { Platform } from "react-native";
import { Color, type Vector3 } from "three";
import { report } from "@/lib/report";
import { sceneKey, useSnapshots } from "@/rooms/snapshots";
import { color } from "@/theme";
import { useThree } from "./r3f";
import { cameraOffset, fitView } from "./view";

/** The Rooms list card's picture shape (its plate is about 342 × 196). */
const ASPECT = 1.75;
/** A picture is taken once the room has been still this long: not mid-drag, not on every step of a furnishing. */
const SETTLE_MS = 1200;

interface Props {
  roomId: string | null;
  scene: Scene;
  points: Vector3[];
  view: RefObject<{ az: number; el: number }>;
  /** Nothing is selected, highlighted or overlaid, and the sheet is closed: the room as it is. */
  clean: boolean;
}

/**
 * Takes the Rooms list card's picture: the room at the person's viewing angle, fitted to a card-shaped band of the
 * canvas, on the card's background. One extra frame, drawn only after the room has settled; phones only (the web
 * build has no files, so its cards keep the plan).
 */
export function Snapshot({ roomId, scene, points, view, clean }: Props) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (Platform.OS === "web" || !roomId || !clean) return;
    const of = sceneKey(scene);
    if (useSnapshots.getState().shots[roomId]?.of === of) return;
    const timer = setTimeout(() => void shoot(get(), points, view.current).then((uri) => useSnapshots.getState().keep(roomId, { uri, of, score: roomCheck(scene).score })).catch((e: unknown) => report(e, { source: "room picture" })), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [roomId, scene, points, view, clean, get]);
  return null;
}

async function shoot({ gl, scene, camera, size, invalidate }: RootState, points: Vector3[], angle: { az: number; el: number }): Promise<string> {
  const band = Math.round(size.width / ASPECT);
  const fit = fitView(points, angle.az, angle.el, size.width, band, 12);
  camera.position.copy(fit.target).add(cameraOffset(angle.az, angle.el, 30));
  camera.lookAt(fit.target);
  camera.zoom = fit.zoom;
  camera.updateProjectionMatrix();
  const was = { color: gl.getClearColor(new Color()), alpha: gl.getClearAlpha() };
  gl.setClearColor(color.surface, 1); // a JPEG has no transparency: the card's own background
  gl.render(scene, camera);
  const dpr = gl.getPixelRatio();
  const rect = { x: 0, y: Math.round(((size.height - band) / 2) * dpr), width: Math.round(size.width * dpr), height: Math.round(band * dpr) };
  try {
    const shot = await GLView.takeSnapshotAsync(gl.getContext() as never, { rect, format: "jpeg", compress: 0.75 });
    if (typeof shot.uri !== "string") throw new Error("room picture: no file");
    return shot.uri;
  } finally {
    gl.setClearColor(was.color, was.alpha);
    invalidate(); // the next frame puts the person's own camera back
  }
}
