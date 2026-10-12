import { StyleSheet, View } from "react-native";
import { create } from "zustand";
import { color } from "@/theme";
import { Text } from "./text";

interface State {
  message: string | null;
  show: (message: string) => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** One short message at a time, gone after a few seconds. Say what happened and, if it matters, what to do next. */
export const useToast = create<State>()((set) => ({
  message: null,
  show: (message) => {
    clearTimeout(timer);
    set({ message });
    timer = setTimeout(() => set({ message: null }), 3200);
  },
}));

export function Toast({ top }: { top: number }) {
  const message = useToast((s) => s.message);
  if (!message) return null;
  return (
    <View pointerEvents="none" style={[styles.row, { top }]}>
      <View accessibilityRole="alert" style={styles.pill}>
        <Text variant="toast" style={{ color: color.bg }}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: "absolute", start: 0, end: 0, alignItems: "center", zIndex: 40 },
  pill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 99, backgroundColor: color.text },
});
