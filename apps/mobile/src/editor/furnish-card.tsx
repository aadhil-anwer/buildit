import { ROOM_KINDS, type RoomKind } from "@buildit/core";
import { Pressable, StyleSheet, View } from "react-native";
import { Chip } from "@/components/chip";
import { Text } from "@/components/text";
import { formatNumber, t } from "@/i18n";
import { report } from "@/lib/report";
import { kindName } from "@/rooms/kind";
import { color, shadow, withAlpha } from "@/theme";
import { useFurnish } from "./furnish-store";
import { useEditor, useScene } from "./store";

/** An empty room's first step: say what the room is, and it is furnished to fit in one tap. */
export function FurnishCard({ bottom, onOwn }: { bottom: number; onOwn: () => void }) {
  const scene = useScene();
  const phase = useFurnish((s) => s.phase);
  const preview = useEditor((s) => s.preview);
  const pending = useFurnish((s) => s.pending);
  if (pending || phase.name === "revealing" || (phase.name === "idle" && (scene.objects.length > 0 || preview))) return null;
  const pick = (kind: RoomKind) => void useFurnish.getState().furnish(kind).catch((e: unknown) => report(e, { source: "furnish", kind }));
  return (
    <View style={[styles.card, { bottom }]} accessibilityLiveRegion="polite">
      <Text variant="kicker" tone="accent">{t("furnishKicker")}</Text>
      <Text variant="heading" style={styles.title}>{t("furnishH")}</Text>
      {phase.name === "placing" ? (
        <Text variant="bodySm" tone="secondary" style={styles.sub}>{t("furnishPlacing", formatNumber(phase.placed + 1))}</Text>
      ) : (
        <>
          <Text variant="bodySm" tone="secondary" style={styles.sub}>{t("furnishP")}</Text>
          <View style={styles.kinds}>
            {ROOM_KINDS.map((k) => <Chip key={k} label={kindName(k)} onPress={() => pick(k)} />)}
          </View>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onOwn} style={styles.own}>
            <Text variant="label" tone="accent">{t("furnishOwn")}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: "absolute", start: 12, end: 12, zIndex: 23, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 12, borderWidth: 1, borderColor: color.divider, borderRadius: 4, backgroundColor: withAlpha(color.bg, 0.97), boxShadow: shadow.md },
  title: { marginTop: 2 },
  sub: { marginTop: 4, marginBottom: 10 },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  own: { alignSelf: "flex-start", marginTop: 12, minHeight: 32, justifyContent: "center" },
});
