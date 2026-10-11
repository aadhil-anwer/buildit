import { Amiri_400Regular } from "@expo-google-fonts/amiri/400Regular";
import { Amiri_700Bold } from "@expo-google-fonts/amiri/700Bold";
import { CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond/400Regular";
import { CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond/600SemiBold";
import { Lora_400Regular } from "@expo-google-fonts/lora/400Regular";
import { Lora_600SemiBold } from "@expo-google-fonts/lora/600SemiBold";
import { NotoNaskhArabic_400Regular } from "@expo-google-fonts/noto-naskh-arabic/400Regular";
import { NotoNaskhArabic_600SemiBold } from "@expo-google-fonts/noto-naskh-arabic/600SemiBold";
import { useFonts } from "expo-font";

export const FONT_FILES = {
  Amiri_400Regular,
  Amiri_700Bold,
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  Lora_400Regular,
  Lora_600SemiBold,
  NotoNaskhArabic_400Regular,
  NotoNaskhArabic_600SemiBold,
};

/** True once every face is ready. A font that fails to load throws, so the error boundary reports it. */
export function useAppFonts() {
  const [ready, error] = useFonts(FONT_FILES);
  if (error) throw error;
  return ready;
}
