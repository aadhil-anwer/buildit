import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/** What the last drawn frame cost, for the performance gate (STACK.md budgets). Read it as `globalThis.__builditPerf`. */
interface PerfStats {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  /** Smoothed gap between drawn frames, in ms (meaningful while something is moving). */
  frameMs: number;
}

type Holder = { __builditPerf?: PerfStats };

/** In development, records draw calls, triangles, memory and frame time of the room scene after every draw. Does nothing in release builds. */
export function PerfProbe() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!__DEV__) return;
    const draw = gl.render.bind(gl);
    let last = performance.now();
    gl.render = (...args) => {
      draw(...args);
      const now = performance.now();
      const holder = globalThis as Holder;
      const { render, memory } = gl.info;
      holder.__builditPerf = { calls: render.calls, triangles: render.triangles, geometries: memory.geometries, textures: memory.textures, frameMs: holder.__builditPerf ? holder.__builditPerf.frameMs * 0.9 + (now - last) * 0.1 : now - last };
      last = now;
    };
    return () => void (gl.render = draw);
  }, [gl]);
  return null;
}
