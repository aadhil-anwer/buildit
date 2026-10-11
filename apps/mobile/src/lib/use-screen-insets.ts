import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The design frame reserves 60 at the top (status bar + 10) and 34 at the bottom; real devices report their own insets. */
export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  return { top: Math.max(insets.top, 50) + 10, bottom: Math.max(insets.bottom, 34) };
}
