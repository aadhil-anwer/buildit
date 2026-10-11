import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { report } from "@/lib/report";
import { color, space } from "@/theme";
import { Button } from "./button";
import { Text } from "./text";

export function ErrorScreen({ error, retry }: { error: Error; retry: () => unknown }) {
  useEffect(() => report(error, { screen: "error-boundary" }), [error]);
  return (
    <View style={styles.root}>
      <Text variant="title">Something went wrong</Text>
      <Text tone="secondary">If it keeps happening, close and reopen the app.</Text>
      <Button title="Try again" onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", gap: space[4], padding: 24, backgroundColor: color.bg },
});
