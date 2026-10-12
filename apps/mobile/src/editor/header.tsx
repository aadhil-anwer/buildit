import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { IconButton } from "@/components/icon-button";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { useEditor } from "./store";

/** Back, the room's name, and undo / redo (greyed when there is nothing to go to). */
export function EditorHeader({ name }: { name: string }) {
  const router = useRouter();
  const canUndo = useEditor((s) => !!s.history?.past.length);
  const canRedo = useEditor((s) => !!s.history?.future.length);
  const { undo, redo } = useEditor.getState();
  return (
    <View style={styles.bar}>
      <IconButton icon="back" label={t("back")} quiet onPress={() => router.back()} />
      <Text variant="roomName" numberOfLines={1} style={styles.name}>{name}</Text>
      <IconButton icon="undo" label={t("undoB")} quiet disabled={!canUndo} onPress={undo} />
      <IconButton icon="redo" label={t("redoB")} quiet disabled={!canRedo} onPress={redo} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 4, height: 44 },
  name: { flex: 1, paddingHorizontal: 6 },
});
