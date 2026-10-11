import { View } from "react-native";
import { signOut } from "@/auth/auth";
import { Button } from "@/components/button";
import { Text } from "@/components/text";
import { t } from "@/i18n";
import { useFail } from "@/lib/use-fail";
import { useScreenInsets } from "@/lib/use-screen-insets";

// A stand-in until My rooms is built (next step); it exists so signing in has somewhere to land and a way back out.
export default function Rooms() {
  const insets = useScreenInsets();
  const fail = useFail();
  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: 24, gap: 24 }}>
      <Text variant="display">{t("rooms")}</Text>
      <Button title={t("signout")} variant="secondary" onPress={() => void signOut().catch(fail)} />
    </View>
  );
}
