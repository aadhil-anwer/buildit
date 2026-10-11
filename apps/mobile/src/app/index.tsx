import { View } from "react-native";
import { Text } from "@/components/text";
import { t } from "@/i18n";

export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text variant="display">{t("brand")}</Text>
    </View>
  );
}
