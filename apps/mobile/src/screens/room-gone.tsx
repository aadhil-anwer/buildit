import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { IconButton } from "@/components/icon-button";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";

/** Shown when a room's screen is opened for a room that no longer exists: says so, and offers the way back. */
export function RoomGone() {
  const router = useRouter();
  const insets = useScreenInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top - 4 }]}>
      <IconButton icon="back" label={t("back")} quiet onPress={() => router.back()} />
      <Text tone="secondary">{t("roomGone")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, paddingHorizontal: 24, gap: 18 } });
