import { applyChange, design, nextSteps, restyle, STYLE_KEYS, suggestions, type NextStep, type Scene, type StyleKey } from "@buildit/core";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { useToast } from "@/components/toast";
import { t, type StringKey } from "@/i18n";
import { color } from "@/theme";
import { ruleText } from "../check-copy";
import { useEditor, useScene } from "../store";
import { useRoomCheck } from "../use-room-check";

/** The first style the room is not already wearing. */
const nextStyle = (scene: Scene): StyleKey | undefined => STYLE_KEYS.find((k) => design.styles[k].wall !== scene.room.wallColor);
const isStyled = (scene: Scene) => STYLE_KEYS.some((k) => design.styles[k].wall === scene.room.wallColor);

function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.step}>
      <Text variant="bodySm" style={styles.stepText}>{label}</Text>
      <Icon name="next" size={16} tint={color.accent} />
    </Pressable>
  );
}

/** What to do next in this room, and one-tap restyles. Typing a request to the designer arrives with the AI designer, so it is not shown yet. */
export function AskPane({ onFix }: { onFix: () => void }) {
  const scene = useScene();
  const { rules } = useRoomCheck(scene);
  const commit = useEditor((s) => s.commit);
  const style = nextStyle(scene);
  // Walking space and saving a version are not built yet, so they are not offered.
  const steps = nextSteps(scene, { rules }, { walkOn: true, unsaved: false, styled: isStyled(scene) });

  const label = (step: NextStep): string => {
    if (step.id === "fix") return t("nx1", ruleText(rules.find((r) => r.id === step.ruleId)!));
    return step.id === "rug" ? t("nx5") : t("nx4", t(design.styles[style ?? "japan"].label as StringKey));
  };
  const run = (step: NextStep) => {
    if (step.id === "fix") return onFix();
    if (step.id === "style" && style) return void commit(restyle(scene, style));
    const rug = suggestions(scene, []).find((s) => s.id === "rug");
    if (!rug || !commit(applyChange(scene, rug.change))) useToast.getState().show(t("rugNoFit"));
  };

  return (
    <View>
      {steps.length ? <Text variant="kicker" tone="secondary" style={styles.kicker}>{t("nextH")}</Text> : null}
      {steps.filter((s) => s.id !== "style" || style).map((step) => <Step key={step.id} label={label(step)} onPress={() => run(step)} />)}
      <Text variant="kicker" tone="secondary" style={[styles.kicker, styles.styles]}>{t("stylesH")}</Text>
      <View style={styles.chips}>
        {STYLE_KEYS.map((key) => (
          <Pressable key={key} accessibilityRole="button" accessibilityLabel={t(design.styles[key].label as StringKey)} accessibilityState={{ selected: design.styles[key].wall === scene.room.wallColor }} hitSlop={{ top: 5, bottom: 5 }} onPress={() => commit(restyle(scene, key))} style={[styles.chip, design.styles[key].wall === scene.room.wallColor && styles.chipOn]}>
            <View style={styles.dots}>{design.styles[key].dots.map((c, i) => <View key={c} style={[styles.dot, { backgroundColor: c, zIndex: 3 - i }]} />)}</View>
            <Text variant="chip">{t(design.styles[key].label as StringKey)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { marginBottom: 2 },
  styles: { marginTop: 18, marginBottom: 8 },
  step: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: color.divider },
  stepText: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 7, paddingStart: 12, paddingEnd: 14, borderWidth: 1, borderColor: color.divider, borderRadius: 99 },
  chipOn: { borderColor: color.accent },
  dots: { flexDirection: "row" },
  dot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1, borderColor: color.divider, marginEnd: -4 },
});
