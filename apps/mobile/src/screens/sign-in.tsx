import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { sendEmailCode, verifyEmailCode } from "@/auth/auth";
import { useAuthAction } from "@/auth/use-auth-action";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { TextField } from "@/components/text-field";
import { t } from "@/i18n";
import { useScreenInsets } from "@/lib/use-screen-insets";

/** Email sign-in: ask for the address, then for the six-digit code that was sent to it. */
export function SignIn() {
  const router = useRouter();
  const insets = useScreenInsets();
  const { run, message, busy } = useAuthAction();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [empty, setEmpty] = useState(false);

  const send = () => {
    setEmpty(!email.trim());
    if (email.trim()) void run(async () => (await sendEmailCode(email.trim()), setSent(true)));
  };
  const error = message ? t(message) : empty ? t("authBadEmail") : undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("back")} onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Icon name="back" />
      </Pressable>
      <Text variant="title">{t(sent ? "authCodeTitle" : "authEmailTitle")}</Text>
      <Text variant="bodySm" tone="secondary">{sent ? t("authCodeHint", email.trim()) : t("authEmailHint")}</Text>
      {sent ? (
        <TextField label={t("authCodeLabel")} value={code} onChangeText={setCode} error={error} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" autoComplete="sms-otp" />
      ) : (
        <TextField label={t("authEmailLabel")} value={email} onChangeText={setEmail} error={error} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
      )}
      <View style={styles.actions}>
        <Button title={t(sent ? "authVerify" : "authSend")} size={16} busy={busy} onPress={sent ? () => void run(() => verifyEmailCode(email.trim(), code.trim())) : send} />
        {sent ? <Button title={t("authResend")} variant="ghost" busy={busy} onPress={() => void run(() => sendEmailCode(email.trim()))} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, gap: 14 },
  back: { alignSelf: "flex-start", marginBottom: 12 },
  actions: { gap: 8, marginTop: 10 },
});
