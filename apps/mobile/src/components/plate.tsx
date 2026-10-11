import { StyleSheet, View, type ViewProps } from "react-native";
import { color } from "@/theme";

/** A picture matted like a tipped-in book plate: surface mat, 1px outline, warm archival grade. */
export function Plate({ children, mat = 6, style, ...props }: ViewProps & { mat?: number }) {
  return (
    <View {...props} style={[styles.outline, style]}>
      <View style={[styles.mat, { borderWidth: mat }]}>
        <View style={styles.grade}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outline: { borderWidth: 1, borderColor: color.divider },
  mat: { flex: 1, borderColor: color.surface, backgroundColor: color.surface, overflow: "hidden" },
  grade: { flex: 1, filter: [{ sepia: 0.22 }, { saturate: 0.82 }, { contrast: 1.05 }] },
});
