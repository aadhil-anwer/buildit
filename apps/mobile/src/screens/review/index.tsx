import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { IconButton } from "@/components/icon-button";
import { Text } from "@/components/text";
import { formatNumber, t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { typeName } from "@/rooms/names";
import { useRooms } from "@/rooms/store";
import { color, withAlpha } from "@/theme";
import { RoomGone } from "../room-gone";
import { ReviewPlan } from "./review-plan";
import { WallSheet } from "./wall-sheet";

/** Check the room before designing in it: correct any wall length, see what was found, then continue. */
export function Review() {
  const router = useRouter();
  const insets = useScreenInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = useRooms((s) => s.rooms.find((r) => r.id === id));
  const save = useRooms((s) => s.save);
  const [wall, setWall] = useState<number | null>(null);
  if (!room) return <RoomGone />;
  const { scene } = room;
  return (
    <View style={[styles.root, { paddingTop: insets.top - 4 }]}>
      <View style={styles.back}>
        <IconButton icon="back" label={t("back")} onPress={() => router.back()} />
      </View>
      <View style={styles.heading}>
        <Text variant="hero" style={styles.title}>{t("revH")}</Text>
        <Text variant="count" tone="secondary">{t("revSub")}</Text>
      </View>
      <ReviewPlan scene={scene} onWall={setWall} />
      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="kicker" tone="secondary" style={styles.kicker}>{t("furn")}</Text>
        {scene.objects.length ? (
          scene.objects.map((o) => (
            <View key={o.id} style={styles.row}>
              <Text variant="row">{typeName(o.type)}</Text>
              <Text variant="row" tone="secondary" style={styles.size}>{`${formatNumber(Math.round(o.w * 100))} × ${formatNumber(Math.round(o.d * 100))} ${t("cm")}`}</Text>
            </View>
          ))
        ) : (
          <Text variant="row" tone="secondary" style={styles.none}>{t("revNoFurn")}</Text>
        )}
      </ScrollView>
      <LinearGradient colors={[withAlpha(color.bg, 0), color.bg, color.bg]} locations={[0, 0.3, 1]} style={[styles.bar, { paddingBottom: insets.bottom }]}>
        <Button title={t("looksRight")} size={17} onPress={() => router.replace(`/editor/${room.id}`)} style={styles.go} />
      </LinearGradient>
      <WallSheet room={scene.room} wall={wall} onChange={(next) => save(room.id, { ...scene, room: next })} onClose={() => setWall(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: { height: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 24 },
  heading: { paddingTop: 6, paddingHorizontal: 24 },
  title: { marginBottom: 4 },
  list: { paddingHorizontal: 24, paddingBottom: 120 },
  kicker: { marginTop: 6, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.divider },
  size: { fontVariant: ["tabular-nums"] },
  none: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.divider },
  bar: { position: "absolute", start: 0, end: 0, bottom: 0, paddingTop: 16, paddingHorizontal: 24 },
  go: { backgroundColor: color.bg },
});
