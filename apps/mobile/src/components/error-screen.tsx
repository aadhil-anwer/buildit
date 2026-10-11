import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { report } from "@/lib/report";
import { color, space } from "@/theme";
import { Button } from "./button";
import { Text } from "./text";

export function ErrorScreen({ error, retry }: { error: Error; retry: () => unknown }) {
  useEffect(() => report(error, { screen: "error-boundary" }), [error]);
  return (
    <View style={styles.root}>
      <Text variant="title">{t("errTitle")}</Text>
      <Text tone="secondary">{t("errBody")}</Text>
      <Button title={t("retry")} onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", gap: space[4], padding: 24, backgroundColor: color.bg },
});
