"use client";

import { useEffect, useState } from "react";
import { layoutReport, type LayoutReport } from "@/core/summary";
import type { Scene } from "@/core/types";

/** Layout analysis of the drawn scene, recomputed shortly after it settles. */
export function useLayoutAnalysis(scene: Scene, paused: boolean): LayoutReport | null {
  const [report, setReport] = useState<LayoutReport | null>(null);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setReport(layoutReport(scene, 0.05)), 120);
    return () => clearTimeout(t);
  }, [scene, paused]);
  return report;
}
