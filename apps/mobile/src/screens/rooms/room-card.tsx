import { essentials, inferKind, roomBounds } from "@buildit/core";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { PlanView } from "@/components/plan-view";
import { Plate } from "@/components/plate";
import { Text } from "@/components/text";
import { formatFixed, formatNumber, t } from "@/i18n";
import { editedText } from "@/rooms/edited";
import { sceneKey, useSnapshots } from "@/rooms/snapshots";
import type { LocalRoom } from "@/rooms/store";
import { color } from "@/theme";

/** "Room check 97 · 4 of 4 essentials": what the room scored when its picture was taken, and how complete it is. */
function useProgress(room: LocalRoom) {
  const shot = useSnapshots((s) => s.shots[room.id]);
  return useMemo(() => {
    const fresh = shot && shot.of === sceneKey(room.scene) ? shot : null; // a picture of an older state shows neither
    const kind = inferKind(room.scene);
    const e = kind ? essentials(room.scene, kind) : null;
    const parts = [
      fresh ? t("cardScore", formatNumber(fresh.score)) : null,
      e ? t("cardEssentials", formatNumber(e.done.length), formatNumber(e.done.length + e.missing.length)) : null,
    ].filter(Boolean);
    return { picture: fresh?.uri ?? null, line: parts.join(" · ") };
  }, [shot, room.scene]);
}

/** One room: its picture (3D once the editor has taken one), name, progress, when it was edited and its size. Press and hold (or the screen reader's Delete action) asks to delete it. */
export function RoomCard({ room, onOpen, onDelete }: { room: LocalRoom; onOpen: () => void; onDelete: () => void }) {
  const b = roomBounds(room.scene.room);
  const size = `${formatFixed(b.maxX - b.minX, 1)} × ${formatFixed(b.maxZ - b.minZ, 1)} ${t("m")}`;
  const meta = `${editedText(room.updatedAt, Date.now())} · ${size}`;
  const { picture, line } = useProgress(room);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={[room.name, line, meta].filter(Boolean).join(". ")} accessibilityHint={t("roomHint")} accessibilityActions={[{ name: "delete", label: t("delRoom") }]} onAccessibilityAction={(e) => e.nativeEvent.actionName === "delete" && onDelete()} onPress={onOpen} onLongPress={onDelete}>
      <Plate mat={5} grade={false} style={styles.picture}>
        {picture ? <Image source={{ uri: picture }} contentFit="contain" style={styles.fill} accessibilityIgnoresInvertColors /> : <PlanView scene={room.scene} />}
      </Plate>
      <View style={styles.row}>
        <Text variant="title" testID="room-name">{room.name}</Text>
        <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.meta}>{meta}</Text>
      </View>
      {line ? <Text variant="caption" tone="accent" style={styles.line}>{line}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picture: { height: 196, backgroundColor: color.surface },
  row: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 10 },
  meta: { flexShrink: 0 },
  fill: { width: "100%", height: "100%" },
  line: { marginTop: 2 },
});
