import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { signOut } from "@/auth/auth";
import { useSession } from "@/auth/session";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { IconButton } from "@/components/icon-button";
import { LanguageToggle } from "@/components/language-toggle";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { report } from "@/lib/report";
import { useFail } from "@/lib/use-fail";
import { useScreenInsets } from "@/lib/use-screen-insets";
import { deleteAccount } from "@/settings/delete-account";
import { useSettings, type WalkwayCm } from "@/settings/store";
import { useAiUsage } from "@/settings/use-ai-usage";
import { color } from "@/theme";

const Section = ({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) => (
  <View style={styles.section}>
    <View style={styles.head}>
      <Text variant="setting">{title}</Text>
      {aside ? <Text variant="count" tone="secondary" style={styles.aside}>{aside}</Text> : null}
    </View>
    {children}
  </View>
);

function UsageSection() {
  const { usage, failed } = useAiUsage();
  return (
    <Section title={t("aiUse")} aside={usage ? t("used", usage.used, usage.limit) : undefined}>
      {usage ? <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }]} /></View> : null}
      {failed ? <Text variant="count" tone="secondary">{t("usageFail")}</Text> : null}
    </Section>
  );
}

/** Who is signed in, sign out (asking first for a guest, who cannot sign back in), and deleting the account. */
function AccountSection() {
  const router = useRouter();
  const session = useSession();
  const fail = useFail();
  const [dialog, setDialog] = useState<"guest-out" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const isGuest = !session?.user.email;

  const remove = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await deleteAccount();
    } catch (e) {
      report(e, { source: "delete-account" });
      setError(t("delFail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title={t("account")}>
      <Text variant="count" tone="secondary" style={styles.email}>{session?.user.email || t("guestAccount")}</Text>
      {isGuest ? <Button title={t("upgradeGuest")} variant="primary" size={15} onPress={() => router.push("/sign-in?upgrade=1")} /> : null}
      <Button title={t("signout")} icon="logout" variant="secondary" size={15} onPress={() => (isGuest ? setDialog("guest-out") : void signOut().catch(fail))} />
      <Button title={t("delAcc")} variant="danger" size={15} onPress={() => setDialog("delete")} style={styles.delete} />
      <ConfirmDialog visible={dialog === "guest-out"} title={t("guestOutH")} body={t("guestOutP")} cancelLabel={t("cancel")} confirmLabel={t("signout")} onCancel={() => setDialog(null)} onConfirm={() => void signOut().catch(fail)} />
      <ConfirmDialog visible={dialog === "delete"} title={t("delH")} body={t("delP")} cancelLabel={t("cancel")} confirmLabel={t("delConf")} error={error} busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void remove()} />
    </Section>
  );
}

/** Language, walkway preference, today's AI usage, and the account. */
export function Settings() {
  const router = useRouter();
  const insets = useScreenInsets();
  const { walkwayCm, setWalkway } = useSettings();
  return (
    <View style={[styles.root, { paddingTop: insets.top - 4 }]}>
      <View style={styles.back}>
        <IconButton icon="back" label={t("back")} onPress={() => router.back()} />
      </View>
      <Text variant="page" style={styles.title}>{t("setH")}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        <Section title={t("langL")}><LanguageToggle /></Section>
        <Section title={t("walkPref")}>
          <Segmented small value={String(walkwayCm)} onChange={(cm) => setWalkway(Number(cm) as WalkwayCm)} options={[{ key: "90", label: t("std") }, { key: "75", label: t("compact") }]} />
        </Section>
        <UsageSection />
        <AccountSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: { height: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 24 },
  title: { paddingTop: 6, paddingHorizontal: 24, paddingBottom: 8 },
  list: { paddingTop: 12, paddingHorizontal: 24, paddingBottom: 120 },
  section: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: color.divider },
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  aside: { fontVariant: ["tabular-nums"] },
  track: { height: 2, backgroundColor: color.divider },
  fill: { height: 2, backgroundColor: color.accent },
  email: { writingDirection: "ltr", textAlign: "left", marginBottom: 14 },
  delete: { marginTop: 10 },
});
