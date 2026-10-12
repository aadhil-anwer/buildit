import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** False when the editor is not the screen in front or the app is in the background: the 3D canvas then draws nothing at all (STACK.md budget). */
export function useCanvasActive() {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => sub.remove();
  }, []);
  return focused && foreground;
}
