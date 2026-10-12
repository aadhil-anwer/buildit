import { placeObject, type ClearanceReport, type OpResult, type Scene } from "@buildit/core";
import { useMemo, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { PlanView } from "@/components/plan-view";
import { planGeometry } from "@/rooms/plan";
import { color } from "@/theme";
import { draggedPose, GRID, hitItem } from "./plan-edit";
import { overlayRuns } from "./walk-overlay";

interface Props {
  scene: Scene;
  selectedId: string | null;
  /** Space the header above and the sheet below take up, so the room is drawn in what is left. */
  topInset: number;
  bottomInset: number;
  /** Where it is walkable, when the walking-space overlay is on. */
  walk: ClearanceReport | null;
  onSelect: (id: string | null) => void;
  /** A drag ended with the engine's answer. A refused move leaves the scene alone, so the piece goes back. */
  onPlace: (id: string, result: OpResult) => void;
}

type Plan = ReturnType<typeof planGeometry>;

/** Tap selects; a drag moves the piece under the finger in 5 cm steps. The moving piece is animated on the UI thread, not through React. */
function useEditGestures(scene: Scene, plan: Plan, { onSelect, onPlace }: Pick<Props, "onSelect" | "onPlace">) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [tx, ty, active] = [useSharedValue(0), useSharedValue(0), useSharedValue("")];
  const begin = (id: string) => {
    onSelect(id);
    setDragId(id);
  };
  const finish = (id: string, dx: number, dy: number) => {
    const piece = scene.objects.find((o) => o.id === id);
    if (piece && (dx || dy)) onPlace(id, placeObject(scene, id, draggedPose(piece, dx, dy, plan.scale)));
    setDragId(null);
  };
  const tap = Gesture.Tap().onEnd((e) => runOnJS(onSelect)(hitItem(plan.items, e.x, e.y)));
  const pan = Gesture.Pan().minDistance(6)
    .onStart((e) => {
      const id = hitItem(plan.items, e.x - e.translationX, e.y - e.translationY);
      active.value = id ?? "";
      if (id) runOnJS(begin)(id);
    })
    .onUpdate((e) => {
      const step = GRID * plan.scale;
      tx.value = Math.round(e.translationX / step) * step;
      ty.value = Math.round(e.translationY / step) * step;
    })
    .onEnd(() => {
      if (active.value) runOnJS(finish)(active.value, tx.value / plan.scale, ty.value / plan.scale);
      active.value = "";
      tx.value = 0;
      ty.value = 0;
    })
    .onFinalize(() => runOnJS(setDragId)(null));
  return { gesture: Gesture.Exclusive(pan, tap), dragId, tx, ty };
}

/** The room from above, fitted to the space between the header and the sheet. */
export function PlanCanvas({ scene, selectedId, topInset, bottomInset, walk, onSelect, onPlace }: Props) {
  const { width, height: screen } = useWindowDimensions();
  const height = Math.max(160, screen - topInset - bottomInset);
  const plan = useMemo(() => planGeometry(scene, width, height, 24), [scene, width, height]);
  const { gesture, dragId, tx, ty } = useEditGestures(scene, plan, { onSelect, onPlace });
  const grabbed = plan.items.find((i) => i.id === dragId);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotate: `${grabbed?.rotation ?? 0}deg` }] }));
  return (
    <GestureDetector gesture={gesture}>
      <View testID="plan-canvas" style={[styles.canvas, { top: topInset, height }]}>
        <PlanView scene={scene} width={width} height={height} pad={24} selectedId={selectedId} hiddenId={dragId} walk={walk ? overlayRuns(walk) : undefined} />
        {/* eslint-disable-next-line no-restricted-syntax -- the plan is drawn in world space (north up), which never mirrors under RTL */}
        {grabbed ? <Animated.View pointerEvents="none" style={[styles.piece, { left: grabbed.cx - grabbed.w / 2, top: grabbed.cy - grabbed.d / 2, width: grabbed.w, height: grabbed.d, backgroundColor: grabbed.color }, style]} /> : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: { position: "absolute", start: 0, end: 0 },
  piece: { position: "absolute", borderWidth: 2, borderColor: color.accent },
});
