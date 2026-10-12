import { applyChange, suggestions, type Suggestion } from "@buildit/core";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { useToast } from "@/components/toast";
import { t, type StringKey } from "@/i18n";
import { color, shadow, withAlpha } from "@/theme";
import { useEditor, useScene } from "./store";

const WORDS: Record<Suggestion["id"], [StringKey, StringKey]> = { lamp: ["sLamp", "sLampWhy"], rug: ["sRug", "sRugWhy"], wall: ["sWall", "sWallWhy"], headboard: ["sHead", "sHeadWhy"] };

/** How long the room sits quiet before a suggestion appears, and before the next one after one is dismissed. */
const FIRST = 2600;
const NEXT = 6000;

/** The first suggestion not yet dismissed, once the room has been left alone a moment: nothing selected, not on the check. */
function useSuggestion() {
  const scene = useScene();
  const [dismissed, selected, tab] = [useEditor((s) => s.dismissed), useEditor((s) => s.selectedId), useEditor((s) => s.tab)];
  const next = suggestions(scene, dismissed)[0];
  const [shown, setShown] = useState<Suggestion["id"] | null>(null);
  const quiet = !selected && tab !== "check";
  useEffect(() => {
    setShown(null);
    if (!next || !quiet) return;
    const timer = setTimeout(() => setShown(next.id), dismissed.length ? NEXT : FIRST);
    return () => clearTimeout(timer);
  }, [next?.id, quiet, scene]); // restarts when the room changes, not when `dismissed` does
  return shown && next?.id === shown ? next : null;
}

/** A small card offering one change ("Try a floor lamp beside the desk"). Try it applies it as one undoable step; either button retires it. */
export function SuggestionCard({ top }: { top: number }) {
  const scene = useScene();
  const suggestion = useSuggestion();
  const enter = useSharedValue(0);
  useEffect(() => void (enter.value = suggestion ? withTiming(1, { duration: 400, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }) : 0), [suggestion, enter]);
  const style = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: (1 - enter.value) * -8 }, { scale: 0.97 + 0.03 * enter.value }] }));
  if (!suggestion) return null;
  const [title, why] = WORDS[suggestion.id];
  const retire = () => useEditor.getState().dismiss(suggestion.id);
  const tryIt = () => {
    if (!useEditor.getState().commit(applyChange(scene, suggestion.change))) useToast.getState().show(t("sugNoFit"));
    retire();
  };
  return (
    <Animated.View style={[styles.card, { top }, style]}>
      <View style={styles.head}>
        <View style={styles.dot} />
        <Text variant="kicker" tone="accent" style={styles.kicker}>{t("sugH")}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t("dismiss")} hitSlop={11} onPress={retire} style={styles.close}><Icon name="close" size={14} /></Pressable>
      </View>
      <Text variant="heading" style={styles.title}>{t(title)}</Text>
      <Text variant="caption" tone="secondary" style={styles.why}>{t(why)}</Text>
      <Button title={t("tryIt")} size={14} onPress={tryIt} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { position: "absolute", end: 14, width: 216, zIndex: 22, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 12, borderWidth: 1, borderColor: color.divider, borderRadius: 4, backgroundColor: withAlpha(color.bg, 0.97), boxShadow: shadow.md },
  head: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2, marginTop: -4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.accent },
  kicker: { flex: 1 },
  close: { width: 22, height: 22, alignItems: "center", justifyContent: "center", marginEnd: -6 },
  title: { marginBottom: 4 },
  why: { marginBottom: 10 },
});
