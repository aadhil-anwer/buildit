import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { IconButton } from "@/components/icon-button";
import { PlanView } from "@/components/plan-view";
import { Plate } from "@/components/plate";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { useRooms } from "@/rooms/store";

// A stand-in for the room editor (Phase 4): it shows the room, and says so when the room is gone.
export function Editor() {
  const router = useRouter();
  const insets = useScreenInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = useRooms((s) => s.rooms.find((r) => r.id === id));
  return (
    <View style={[styles.root, { paddingTop: insets.top - 4 }]}>
      <IconButton icon="back" label={t("back")} quiet onPress={() => router.back()} />
      {room ? (
        <>
          <Text variant="title">{room.name}</Text>
          <Plate mat={5} grade={false} style={styles.plan}><PlanView scene={room.scene} /></Plate>
        </>
      ) : (
        <Text tone="secondary">{t("roomGone")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, gap: 18 },
  plan: { height: 360 },
});
