import { Pressable, StyleSheet, View } from "react-native";
import { color, withAlpha } from "@/theme";
import { Text } from "./text";

export interface SegmentedOption<K extends string> {
  key: K;
  label: string;
  /** Set this label in Arabic type whatever the app language (a language's own name). */
  arabic?: boolean;
}

/** A hairline pill holding options; the chosen one is tinted gold. `small` sets the labels at 13px; `floating` is the version that sits over the room (heading face, see-through background). */
export function Segmented<K extends string>({ options, value, onChange, small, floating }: { options: SegmentedOption<K>[]; value: K; onChange: (key: K) => void; small?: boolean; floating?: boolean }) {
  return (
    <View style={[styles.pill, floating && styles.floating]}>
      {options.map(({ key, label, arabic }) => {
        const on = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: on }}
            hitSlop={{ top: 7, bottom: 7 }} // 30 + 14 = 44pt tap target
            onPress={() => (on ? undefined : onChange(key))}
            style={[styles.option, on && styles.on]}
          >
            <Text variant={floating ? "pill" : small ? "label" : "control"} arabic={arabic} tone={on ? "accent" : "default"}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", flexDirection: "row", gap: 2, padding: 2, borderWidth: 1, borderColor: color.divider, borderRadius: 99 },
  floating: { backgroundColor: withAlpha(color.bg, 0.92) },
  option: { justifyContent: "center", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99 },
  on: { backgroundColor: withAlpha(color.accent, 0.16) },
});
