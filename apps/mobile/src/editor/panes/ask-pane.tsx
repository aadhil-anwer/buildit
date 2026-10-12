import { applyChange, design, nextSteps, restyle, STYLE_KEYS, suggestions, type NextStep, type Scene, type StyleKey } from "@buildit/core";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { send, useAsk } from "@/ai/ask-store";
import { useSession } from "@/auth/session";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { useToast } from "@/components/toast";
import { t, type StringKey } from "@/i18n";
import { color } from "@/theme";
import { textStyle } from "@/theme/typography";
import { ruleText } from "../check-copy";
import { useRooms } from "@/rooms/store";
import { useAiUsage } from "@/settings/use-ai-usage";
import { Done, Failed, Guest, Limit, Running } from "./ask-cards";
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

/** Suggested next steps for this room, each with its words and what it does when tapped. */
function useNextSteps(onFix: () => void) {
  const scene = useScene();
  const { rules } = useRoomCheck(scene);
  const commit = useEditor((s) => s.commit);
  const style = nextStyle(scene);
  const roomId = useEditor((s) => s.roomId);
  const edited = useEditor((s) => !!s.history?.past.length);
  const lastSaved = useRooms((s) => s.rooms.find((r) => r.id === roomId)?.versions?.at(-1)?.scene);
  const walkOn = useEditor((s) => s.walk);
  const steps = nextSteps(scene, { rules }, { walkOn, unsaved: edited && lastSaved !== scene, styled: isStyled(scene) }).filter((s) => s.id !== "style" || style);

  const label = (step: NextStep): string => {
    if (step.id === "fix") return t("nx1", ruleText(rules.find((r) => r.id === step.ruleId)!));
    if (step.id === "save") return t("nx3");
    if (step.id === "walk") return t("nx2");
    return step.id === "rug" ? t("nx5") : t("nx4", t(design.styles[style ?? "japan"].label as StringKey));
  };
  const run = (step: NextStep) => {
    if (step.id === "fix") return onFix();
    if (step.id === "style" && style) return void commit(restyle(scene, style));
    if (step.id === "walk") return useEditor.getState().setWalk(true);
    if (step.id === "save" && roomId) {
      useRooms.getState().saveVersion(roomId, t("verSaveLabel"));
      return useToast.getState().show(t("tKept"));
    }
    const rug = suggestions(scene, []).find((s) => s.id === "rug");
    if (!rug || !commit(applyChange(scene, rug.change))) useToast.getState().show(t("rugNoFit"));
  };
  return { steps, label, run };
}

function StyleChips() {
  const scene = useScene();
  const commit = useEditor((s) => s.commit);
  return (
    <View style={styles.chips}>
      {STYLE_KEYS.map((key) => {
        const on = design.styles[key].wall === scene.room.wallColor;
        const name = t(design.styles[key].label as StringKey);
        return (
          <Pressable key={key} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: on }} hitSlop={{ top: 5, bottom: 5 }} onPress={() => commit(restyle(scene, key))} style={[styles.chip, on && styles.chipOn]}>
            <View style={styles.dots}>{design.styles[key].dots.map((c, i) => <View key={c} style={[styles.dot, { backgroundColor: c, zIndex: 3 - i }]} />)}</View>
            <Text variant="chip">{name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const CHIPS = ["chip1", "chip2", "chip3", "chip4"] as const;

/** The request box, how many requests are left today, and the design's four quick asks. */
function AskBox({ disabled }: { disabled?: boolean }) {
  const [text, setText] = useState("");
  const requests = useAsk((s) => s.requests);
  const { usage } = useAiUsage(requests);
  const submit = (question: string) => {
    if (!question.trim()) return;
    setText("");
    void send(question.trim());
  };
  return (
    <View>
      {disabled ? null : (
        <View style={styles.box}>
          <TextInput accessibilityLabel={t("askPh")} placeholder={t("askPh")} placeholderTextColor={color.neutral500} value={text} onChangeText={setText} onSubmitEditing={() => submit(text)} returnKeyType="send" maxLength={1000} style={styles.input} />
          <Pressable accessibilityRole="button" accessibilityLabel={t("aiSend")} accessibilityState={{ disabled: !text.trim() }} disabled={!text.trim()} hitSlop={3} onPress={() => submit(text)} style={[styles.send, !text.trim() && styles.sendOff]}>
            <Icon name="send" size={18} tint={color.accent} />
          </Pressable>
        </View>
      )}
      {usage ? <Text variant="caption" tone="secondary" style={styles.usage}>{t("left", Math.max(0, usage.limit - usage.used), usage.limit)}</Text> : null}
    </View>
  );
}

function AskChips({ disabled }: { disabled?: boolean }) {
  return (
    <View style={[styles.chips, disabled && styles.dim]}>
      {CHIPS.map((key) => (
        <Pressable key={key} accessibilityRole="button" accessibilityLabel={t(key)} accessibilityState={{ disabled: !!disabled }} disabled={disabled} hitSlop={{ top: 5, bottom: 5 }} onPress={() => void send(t(key))} style={styles.askChip}>
          <Text variant="chip">{t(key)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Ask: the designer (request box, quick asks, and the answer as it arrives), then what to do next in this room and one-tap restyles. */
export function AskPane({ onFix }: { onFix: () => void }) {
  const { steps, label, run } = useNextSteps(onFix);
  const phase = useAsk((s) => s.phase);
  const session = useSession();
  const guest = !session?.user.email;
  if (phase.name === "running") return <Running phase={phase} />;
  if (phase.name === "done") return <Done phase={phase} />;
  if (phase.name === "error") return <Failed phase={phase} />;
  const limited = phase.name === "limit";
  return (
    <View>
      {guest || phase.name === "guest" ? <Guest /> : limited ? <Limit phase={phase} /> : <AskBox />}
      {steps.length ? <Text variant="kicker" tone="secondary" style={[styles.kicker, styles.first]}>{t("nextH")}</Text> : null}
      {steps.map((step) => <Step key={step.id} label={label(step)} onPress={() => run(step)} />)}
      <Text variant="kicker" tone="secondary" style={[styles.kicker, styles.styles]}>{t("stylesH")}</Text>
      <StyleChips />
      {guest ? null : (
        <>
          <Text variant="kicker" tone="secondary" style={[styles.kicker, styles.styles]}>{t("askH")}</Text>
          <AskChips disabled={limited} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { marginBottom: 2 },
  first: { marginTop: 18 },
  box: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, paddingStart: 18, paddingEnd: 5, borderWidth: 1, borderColor: color.divider, borderRadius: 99 },
  input: { flex: 1, minWidth: 0, height: 36, paddingVertical: 0, fontFamily: textStyle("body", false).fontFamily, fontSize: 15, color: color.text },
  send: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: color.accent, alignItems: "center", justifyContent: "center" },
  sendOff: { opacity: 0.4 },
  usage: { marginTop: 8, fontVariant: ["tabular-nums"] },
  dim: { opacity: 0.45 },
  styles: { marginTop: 18, marginBottom: 8 },
  step: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: color.divider },
  stepText: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  askChip: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: color.divider, borderRadius: 99 },
  chip: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 7, paddingStart: 12, paddingEnd: 14, borderWidth: 1, borderColor: color.divider, borderRadius: 99 },
  chipOn: { borderColor: color.accent },
  dots: { flexDirection: "row" },
  dot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1, borderColor: color.divider, marginEnd: -4 },
});
