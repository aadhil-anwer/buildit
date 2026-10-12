import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { addAlternative, another, dismiss, keep, send, undoResult, type Phase } from "@/ai/ask-store";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { formatFixed, t } from "@/i18n";
import { typeName } from "@/rooms/names";
import { color, rust } from "@/theme";

type Of<N extends Phase["name"]> = Extract<Phase, { name: N }>;

/** "Working through it": what the designer has done so far, in the person's words, as it does it. */
export function Running({ phase }: { phase: Of<"running"> }) {
  return (
    <View>
      <Text variant="paneTitle" style={styles.title}>{t("working")}</Text>
      <Text variant="small" tone="secondary" style={styles.quote}>{`“${phase.question}”`}</Text>
      {phase.lines.map((line, i) => (
        <View key={i} style={styles.line}>
          <Icon name="check" size={16} tint={color.accent} />
          <Text variant="bodySm" style={styles.grow}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

const m = (v: number) => formatFixed(v, 1);

/** "It won't fit": what it needs against what there is (measured), what removing a piece would give, and a smaller one that does fit. */
function NoFitCard({ nofit }: { nofit: NonNullable<Of<"done">["nofit"]> }) {
  const alt = nofit.alternative;
  return (
    <View>
      <Text variant="paneTitle" style={styles.title}>{t("aiNofitH", typeName(nofit.type as never))}</Text>
      <Text variant="bodySm" tone="secondary" style={styles.reply}>{t("aiNofitP", m(nofit.need.w), m(nofit.need.d), m(nofit.largest.w), m(nofit.largest.d))}</Text>
      {nofit.without ? <Text variant="bodySm" tone="secondary" style={styles.reply}>{t("aiNofitWithout", m(nofit.without.w), m(nofit.without.d), typeName(nofit.without.type as never))}</Text> : null}
      <Text variant="bodySm" style={styles.verdict}>{alt ? t("aiNofitTry", typeName(alt.type as never), Math.round(alt.w * 100), Math.round(alt.d * 100)) : t("aiNofitNone")}</Text>
      <View style={styles.actions}>
        {alt ? <Button title={t("aiAddAlt", typeName(alt.type as never))} size={15} onPress={() => addAlternative(alt.catalogId, alt.type as never)} style={styles.grow} /> : null}
        <Button title={t("aiGotIt")} variant="secondary" size={15} onPress={dismiss} style={styles.grow} />
      </View>
    </View>
  );
}

const VERDICT = { changed: ["aiDone", null], unchanged: ["aiNothing", "aiNothingP"], reverted: ["aiReverted", "aiRevertedP"] } as const;

/** The answer: what changed, the engine's measured before and after, and Keep / Undo / another option. */
export function Done({ phase }: { phase: Of<"done"> }) {
  if (phase.nofit && phase.verdict !== "changed") return <NoFitCard nofit={phase.nofit} />;
  const [title, body] = VERDICT[phase.verdict];
  const changed = phase.verdict === "changed";
  return (
    <View>
      <Text variant="paneTitle" style={styles.title}>{t(title)}</Text>
      {phase.reply ? <Text variant="bodySm" style={styles.reply}>{phase.reply}</Text> : null}
      {body ? <Text variant="bodySm" tone="secondary">{t(body)}</Text> : null}
      {phase.lines.length ? <Text variant="kicker" tone="secondary" style={styles.kicker}>{t("changed")}</Text> : null}
      {phase.lines.map((line, i) => <Text key={i} variant="bodySm" style={styles.row}>{line}</Text>)}
      {phase.rows.length ? <Text variant="kicker" tone="secondary" style={styles.kicker}>{t("measured")}</Text> : null}
      {phase.rows.map((r) => (
        <View key={r.key} style={[styles.row, styles.fact]}>
          <Text variant="bodySm" style={styles.grow}>{r.label}</Text>
          <Text variant="bodySm" tone="secondary" style={styles.num}>{r.before}</Text>
          <Icon name="next" size={14} tint={color.neutral500} />
          <Text variant="label" tone="accent" style={styles.num}>{r.after}</Text>
        </View>
      ))}
      <View style={styles.actions}>
        {changed ? <Button title={t("keep")} size={16} onPress={keep} style={styles.grow} /> : null}
        {changed ? <Button title={t("undoB")} variant="secondary" size={16} onPress={undoResult} style={styles.grow} /> : <Button title={t("aiGotIt")} variant="secondary" size={16} onPress={dismiss} style={styles.grow} />}
      </View>
      {changed ? <Button title={t("another")} variant="ghost" size={15} onPress={another} style={styles.another} /> : null}
    </View>
  );
}

/** The daily limit: when it resets, and what still works. */
export function Limit({ phase }: { phase: Of<"limit"> }) {
  const minutes = Math.max(0, Math.round((phase.resetsAt.getTime() - Date.now()) / 60_000));
  return (
    <View style={styles.limit}>
      <Icon name="clock" size={26} tint={rust.base} />
      <View style={styles.grow}>
        <Text variant="paneTitle" style={styles.title}>{t("limitH")}</Text>
        <Text variant="bodySm" tone="secondary">{t("limitP", Math.floor(minutes / 60), minutes % 60)}</Text>
      </View>
    </View>
  );
}

/** A guest login cannot use the designer: say why and offer the way in. */
export function Guest() {
  const router = useRouter();
  return (
    <View>
      <Text variant="paneTitle" style={styles.title}>{t("aiGuestH")}</Text>
      <Text variant="bodySm" tone="secondary" style={styles.reply}>{t("aiGuestP")}</Text>
      <Button title={t("upgradeGuest")} size={15} onPress={() => router.push("/upgrade")} />
    </View>
  );
}

const ERROR = { offline: ["aiErrOfflineH", "aiErrOfflineP"], unreachable: ["aiErrDownH", "aiErrDownP"], model_failed: ["aiErrDownH", "aiErrDownP"], refused: ["aiErrRefusedH", "aiErrRefusedP"], too_long: ["aiErrLongH", "aiErrLongP"] } as const;

/** Something went wrong: what happened, that the room is unchanged, and what to do. */
export function Failed({ phase }: { phase: Of<"error"> }) {
  const [title, body] = ERROR[phase.kind];
  const retry = phase.kind !== "refused";
  return (
    <View>
      <Text variant="paneTitle" style={styles.title}>{t(title)}</Text>
      <Text variant="bodySm" tone="secondary" style={styles.reply}>{t(body)}</Text>
      <View style={styles.actions}>
        {retry ? <Button title={t("aiRetry")} size={15} onPress={() => void send(phase.question)} style={styles.grow} /> : null}
        <Button title={t("aiGotIt")} variant="secondary" size={15} onPress={dismiss} style={styles.grow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  quote: { fontStyle: "italic", marginBottom: 8 },
  reply: { marginBottom: 10 },
  verdict: { paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.divider },
  kicker: { marginTop: 14, marginBottom: 4 },
  line: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: color.divider },
  row: { paddingVertical: 7, borderTopWidth: 1, borderTopColor: color.divider },
  fact: { flexDirection: "row", alignItems: "center", gap: 8 },
  grow: { flex: 1 },
  num: { fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  another: { marginTop: 6 },
  limit: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
});
