import { useEffect, useRef } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";
import { color } from "@/theme";

/** Placeholder block that pulses on the native thread. The design forbids spinners. */
export function Skeleton({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const pulse = (toValue: number) => Animated.timing(opacity, { toValue, duration: 800, useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([pulse(1), pulse(0.5)]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={[{ backgroundColor: color.surface, opacity }, style]} />;
}
