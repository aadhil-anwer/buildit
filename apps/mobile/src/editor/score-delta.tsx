import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Text } from "@/components/text";
import { formatNumber } from "@/i18n";
import { haptic } from "@/lib/haptics";
import { useReduceMotion } from "@/lib/reduce-motion";
import { color, rust } from "@/theme";

const SHOW_MS = 1100;

/** A small "+6" that rises from the room-check chip when a change really improved the room ("−6" in rust when it got worse). */
export function ScoreDelta({ score, live }: { score: number; live: boolean }) {
  const prev = useRef(score);
  const [delta, setDelta] = useState<{ n: number; key: number } | null>(null);
  const t = useSharedValue(0);
  const calm = useReduceMotion();
  useEffect(() => {
    const n = score - prev.current;
    prev.current = score;
    if (!live || n === 0) return; // previews (the designer working, a reveal) are not the person's doing
    if (n > 0) haptic.win();
    setDelta({ n, key: Date.now() });
    t.value = 0;
    t.value = withTiming(1, { duration: SHOW_MS, easing: Easing.out(Easing.cubic) });
  }, [score, live, t]);
  useEffect(() => {
    if (!delta) return;
    const timer = setTimeout(() => setDelta(null), SHOW_MS); // owned by this delta, so a later score change can't strand it on screen
    return () => clearTimeout(timer);
  }, [delta]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - t.value * t.value, transform: [{ translateY: calm ? 0 : -16 * t.value }] }));
  if (!delta) return null;
  const up = delta.n > 0;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style]}>
      <Text variant="label" style={{ color: up ? color.accent700 : rust.dark }}>{`${up ? "+" : "−"}${formatNumber(Math.abs(delta.n))}`}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: -4, start: 34, zIndex: 2 },
});
