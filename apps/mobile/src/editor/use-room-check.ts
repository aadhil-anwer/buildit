import { roomCheck, type Scene } from "@buildit/core";
import { useMemo } from "react";

/** The room check for a scene, recomputed only when the scene changes. */
export const useRoomCheck = (scene: Scene) => useMemo(() => roomCheck(scene), [scene]);
