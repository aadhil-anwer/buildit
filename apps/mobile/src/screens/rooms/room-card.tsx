import { roomBounds } from "@buildit/core";
import { Pressable, StyleSheet, View } from "react-native";
import { PlanView } from "@/components/plan-view";
import { Plate } from "@/components/plate";
import { Text } from "@/components/text";
import { formatFixed, t } from "@/i18n";
import { editedText } from "@/rooms/edited";
import type { LocalRoom } from "@/rooms/store";
import { color } from "@/theme";

/** One room: its picture, name, when it was edited and its size. */
export function RoomCard({ room, onOpen }: { room: LocalRoom; onOpen: () => void }) {
  const b = roomBounds(room.scene.room);
  const size = `${formatFixed(b.maxX - b.minX, 1)} × ${formatFixed(b.maxZ - b.minZ, 1)} ${t("m")}`;
  const meta = `${editedText(room.updatedAt, Date.now())} · ${size}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${room.name}. ${meta}`} onPress={onOpen}>
      <Plate mat={5} grade={false} style={styles.picture}>
        <PlanView scene={room.scene} />
      </Plate>
      <View style={styles.row}>
        <Text variant="title" testID="room-name">{room.name}</Text>
        <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.meta}>{meta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picture: { height: 196, backgroundColor: color.surface },
  row: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 10 },
  meta: { flexShrink: 0 },
});
