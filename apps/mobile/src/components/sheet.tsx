import { useEffect, type ReactNode } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { color, withAlpha } from "@/theme";
import { fitHeights, nextSnap, settleSnap, type Snap } from "./sheet-snap";

/** 20 on iOS; the Android handoff asks for 28. */
const CORNER = Platform.OS === "android" ? 28 : 20;
const GLIDE = { duration: 380, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };

interface Props {
  snap: Snap;
  onSnapChange: (snap: Snap) => void;
  children: ReactNode;
}

/** The editor's bottom panel at 196 / 404 / 640 pt. Drag the grabber or tap it to cycle; the height runs on the UI thread. */
export function Sheet({ snap, onSnapChange, children }: Props) {
  const heights = fitHeights(useWindowDimensions().height, useScreenInsets().top + 24);
  const height = useSharedValue(heights[snap]);
  const start = useSharedValue(0);
  const [min, max] = [heights.peek, heights.full];
  const target = heights[snap];
  useEffect(() => void (height.value = withTiming(target, GLIDE)), [target, height]);

  const pan = Gesture.Pan()
    .onStart(() => void (start.value = height.value))
    .onUpdate((e) => void (height.value = Math.min(max, Math.max(min, start.value - e.translationY))))
    .onEnd((e) => {
      const next = settleSnap(height.value, -e.velocityY, heights);
      height.value = withTiming(heights[next], GLIDE);
      runOnJS(onSnapChange)(next);
    });
  const tap = Gesture.Tap().onEnd(() => runOnJS(onSnapChange)(nextSnap(snap)));
  const style = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View testID="sheet" style={[styles.sheet, style]}>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View accessible accessibilityRole="button" accessibilityLabel={t("sheetResize")} onAccessibilityTap={() => onSnapChange(nextSnap(snap))} hitSlop={{ top: 11, bottom: 11 }} style={styles.grabber}>
          <View style={styles.bar} />
        </View>
      </GestureDetector>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: "absolute", start: 0, end: 0, bottom: 0, borderTopStartRadius: CORNER, borderTopEndRadius: CORNER, borderTopWidth: 1, borderColor: color.divider, backgroundColor: color.bg, boxShadow: `0 -6px 28px ${withAlpha(color.text, 0.14)}` },
  grabber: { height: 22, alignItems: "center", justifyContent: "center" },
  bar: { width: 38, height: 4, borderRadius: 2, backgroundColor: color.neutral300 },
});
