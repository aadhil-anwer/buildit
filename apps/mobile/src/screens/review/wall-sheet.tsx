import { adjustWallLength, getWalls, type Room } from "@buildit/core";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { IconButton } from "@/components/icon-button";
import { Text } from "@/components/text";
import { formatFixed, t } from "@/i18n";
import { color, shadow, withAlpha } from "@/theme";

const STEP = 0.05;

/** A bottom sheet that changes one wall's length by 5 cm a tap. A step the room cannot take is disabled. */
export function WallSheet({ room, wall, onChange, onClose }: { room: Room; wall: number | null; onChange: (room: Room) => void; onClose: () => void }) {
  const length = wall === null ? 0 : getWalls(room)[wall].length;
  const [shorter, longer] = [-STEP, STEP].map((delta) => (wall === null ? null : adjustWallLength(room, wall, delta)));
  return (
    <Modal visible={wall !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessible={false} style={styles.backdrop} onPress={onClose}>
        <Pressable accessible={false} testID="wall-sheet" style={styles.sheet}>
          <Text variant="kicker" tone="secondary" style={styles.label}>{t("wallLen")}</Text>
          <View style={styles.stepper}>
            <IconButton icon="minus" label={t("shorter")} disabled={!shorter} onPress={() => shorter && onChange(shorter)} />
            <Text variant="stepper" style={styles.value}>{`${formatFixed(length, 2)} ${t("m")}`}</Text>
            <IconButton icon="plus" label={t("longer")} disabled={!longer} onPress={() => longer && onChange(longer)} />
          </View>
          <Button title={t("done")} size={16} onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: withAlpha(color.text, 0.28) },
  sheet: { paddingTop: 22, paddingHorizontal: 24, paddingBottom: 40, borderTopStartRadius: 18, borderTopEndRadius: 18, backgroundColor: color.bg, boxShadow: shadow.lg },
  label: { marginBottom: 14 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  value: { fontVariant: ["tabular-nums"] },
});
