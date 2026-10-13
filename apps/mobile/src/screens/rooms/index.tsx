import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { IconButton } from "@/components/icon-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/skeleton";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { useHints } from "@/lib/hints";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { useEditor } from "@/editor/store";
import { useRooms, useRoomsReady, type LocalRoom } from "@/rooms/store";
import { useSyncStatus } from "@/sync/use-sync";
import { color, withAlpha } from "@/theme";
import { EmptyState } from "./empty-state";
import { RoomCard } from "./room-card";

/** Said until the first room is opened or a delete is started, then never again. */
function DeleteHint() {
  const seen = useHints((s) => s.seen.roomDelete);
  return seen ? null : <Text variant="small" tone="secondary" style={styles.count}>{t("hintRoomDelete")}</Text>;
}

function RoomList({ ready, rooms, onDelete }: { ready: boolean; rooms: LocalRoom[]; onDelete: (room: LocalRoom) => void }) {
  const router = useRouter();
  const open = (id: string) => {
    useHints.getState().see("roomDelete");
    router.push(`/editor/${id}`);
  };
  const del = (room: LocalRoom) => {
    useHints.getState().see("roomDelete");
    onDelete(room);
  };
  return (
    <ScrollView contentContainerStyle={rooms.length || !ready ? styles.list : undefined}>
      {!ready ? [0, 1, 2].map((i) => <Skeleton key={i} label={t("loadingRooms")} style={styles.skeleton} />) : null}
      {ready && !rooms.length ? <EmptyState /> : null}
      {ready ? rooms.map((room) => <RoomCard key={room.id} room={room} onOpen={() => open(room.id)} onDelete={() => del(room)} />) : null}
    </ScrollView>
  );
}

/** My rooms: every room as a picture, or an explanation of the three ways in when there are none. */
export function Rooms() {
  const router = useRouter();
  const insets = useScreenInsets();
  const ready = useRoomsReady();
  const syncFailed = useSyncStatus((s) => s.failed);
  const rooms = useRooms((s) => s.rooms).toSorted((a, b) => b.updatedAt - a.updatedAt);
  const [deleting, setDeleting] = useState<LocalRoom | null>(null);
  const confirmDelete = () => {
    if (deleting) {
      if (useEditor.getState().roomId === deleting.id) useEditor.setState({ roomId: null, history: null });
      useRooms.getState().remove(deleting.id);
    }
    setDeleting(null);
  };
  return (
    <View style={[styles.root, { paddingTop: insets.top - 4 }]}>
      <View style={styles.header}>
        <View>
          <Text variant="display">{t("rooms")}</Text>
          {ready && rooms.length ? <Text variant="count" tone="secondary" style={styles.count}>{t("nRooms", rooms.length)}</Text> : null}
          {ready && rooms.length ? <DeleteHint /> : null}
        </View>
        <IconButton icon="sliders" label={t("setH")} onPress={() => router.push("/settings")} />
      </View>
      {syncFailed ? <Text variant="small" tone="secondary" accessibilityRole="alert" style={styles.sync}>{t("syncFailed")}</Text> : null}
      <RoomList ready={ready} rooms={rooms} onDelete={setDeleting} />
      <ConfirmDialog visible={!!deleting} title={t("delRoomH")} body={deleting ? t("delRoomP", deleting.name) : ""} cancelLabel={t("cancel")} confirmLabel={t("delConf")} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      <LinearGradient colors={[withAlpha(color.bg, 0), color.bg, color.bg]} locations={[0, 0.34, 1]} style={[styles.bar, { paddingBottom: insets.bottom }]}>
        <Button title={t("scan")} icon="scan" size={17} onPress={() => router.push("/capture")} style={styles.scan} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 10, paddingHorizontal: 24, paddingBottom: 12 },
  count: { marginTop: 6 },
  sync: { paddingHorizontal: 24, paddingBottom: 12 },
  list: { paddingTop: 4, paddingHorizontal: 24, paddingBottom: 150, gap: 26 },
  skeleton: { height: 196 },
  bar: { position: "absolute", start: 0, end: 0, bottom: 0, paddingTop: 16, paddingHorizontal: 24 },
  scan: { backgroundColor: color.bg },
});
