import { Modal, Pressable, StyleSheet, View } from "react-native";
import { color, shadow, withAlpha } from "@/theme";
import { Button } from "./button";
import { Text } from "./text";

interface Props {
  visible: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  error?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** A centred question with a cancel and a (dangerous) confirm. Used where something cannot be undone. */
export function ConfirmDialog({ visible, title, body, cancelLabel, confirmLabel, error, busy, onCancel, onConfirm }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable accessible={false} style={styles.backdrop} onPress={onCancel}>
        <Pressable accessible={false} style={styles.card}>
          <Text variant="dialogTitle" style={styles.title}>{title}</Text>
          <Text variant="bodySm" tone="secondary" style={styles.body}>{body}</Text>
          {error ? <Text variant="caption" tone="danger" accessibilityRole="alert" style={styles.body}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button title={cancelLabel} variant="secondary" size={15} onPress={onCancel} style={styles.action} />
            <Button title={confirmLabel} variant="danger" size={15} busy={busy} onPress={onConfirm} style={styles.action} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: withAlpha(color.text, 0.42) },
  card: { padding: 24, borderWidth: 1, borderColor: color.divider, borderRadius: 4, backgroundColor: color.bg, boxShadow: shadow.lg },
  title: { marginBottom: 10 },
  body: { marginBottom: 20 },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1 },
});
