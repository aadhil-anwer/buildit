import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { IconButton } from "@/components/icon-button";
import { PlanView } from "@/components/plan-view";
import { Plate } from "@/components/plate";
import { Tag } from "@/components/tag";
import { Text } from "@/components/text";
import { Toast, useToast } from "@/components/toast";
import { useEditor } from "@/editor/store";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { useRooms, type LocalRoom, type LocalVersion } from "@/rooms/store";
import { versionTime } from "@/rooms/version-time";
import { color } from "@/theme";
import { RoomGone } from "./room-gone";

function Row({ room, name, time, current, onRestore }: { room: LocalRoom; name: string; time: string; current?: boolean; onRestore?: () => void }) {
  return (
    <View style={styles.row}>
      <Plate mat={4} grade={false} style={styles.thumb}><PlanView scene={room.scene} width={104} height={72} pad={4} /></Plate>
      <View style={styles.text}>
        <Text variant="versionName">{name}</Text>
        <Text variant="caption" tone="secondary" style={styles.time}>{time}</Text>
        {current ? <View style={styles.tag}><Tag>{t("current")}</Tag></View> : null}
        {onRestore ? <Button title={t("restore")} variant="ghost" size={14} onPress={onRestore} style={styles.restore} /> : null}
      </View>
    </View>
  );
}

/** Every version saved on purpose, newest first, with the room as it is now at the top. Restoring is one undoable step. */
export function Versions() {
  const router = useRouter();
  const insets = useScreenInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = useRooms((s) => s.rooms.find((r) => r.id === id));
  if (!room) return <RoomGone />;
  const saved = [...(room.versions ?? [])].reverse();
  const now = Date.now();

  const save = () => {
    useRooms.getState().saveVersion(room.id, null);
    useToast.getState().show(t("tKept"));
  };
  const restore = (version: LocalVersion) => {
    const editor = useEditor.getState();
    if (editor.roomId !== room.id) editor.open(room.id, room.scene);
    useEditor.getState().set(version.scene);
    useToast.getState().show(t("tRest"));
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top - 4 }]}>
      <View style={styles.bar}>
        <IconButton icon="back" label={t("back")} onPress={() => router.back()} />
        <Button title={t("saveVer")} variant="ghost" size={15} onPress={save} style={styles.save} />
      </View>
      <Text variant="page" style={styles.title}>{t("verH")}</Text>
      <Text variant="count" tone="secondary" style={styles.sub}>{t("verSub")}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        <Row room={room} name={t("verCurrent")} time={versionTime(room.updatedAt, now)} current />
        {saved.map((v) => <Row key={v.id} room={{ ...room, scene: v.scene }} name={v.label ?? t("verSaveLabel")} time={versionTime(v.createdAt, now)} onRestore={() => restore(v)} />)}
        {saved.length ? null : <Text variant="bodySm" tone="secondary" style={styles.none}>{t("verNone")}</Text>}
      </ScrollView>
      <Toast top={insets.top + 100} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24 },
  save: { paddingHorizontal: 0 },
  title: { paddingTop: 6, paddingHorizontal: 24 },
  sub: { paddingHorizontal: 24, paddingBottom: 8, marginTop: 4 },
  list: { paddingTop: 8, paddingHorizontal: 24, paddingBottom: 120 },
  row: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: color.divider },
  thumb: { width: 112, height: 80 },
  text: { flex: 1 },
  time: { marginTop: 3 },
  tag: { marginTop: 8 },
  restore: { alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 0 },
  none: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: color.divider },
});
