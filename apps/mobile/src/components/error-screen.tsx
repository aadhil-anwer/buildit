import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { report } from "@/lib/report";

export function ErrorScreen({ error, retry }: { error: Error; retry: () => unknown }) {
  useEffect(() => report(error, { screen: "error-boundary" }), [error]);
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text>If it keeps happening, close and reopen the app.</Text>
      <Pressable accessibilityRole="button" onPress={retry}>
        <Text>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 24 },
});
