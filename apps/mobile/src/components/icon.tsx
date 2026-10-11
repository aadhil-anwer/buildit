import { Check, ChevronLeft, ScanLine, SlidersHorizontal } from "lucide-react-native";
import { I18nManager } from "react-native";
import { color } from "@/theme";

/** Icons are named for what they mean; `mirror` flips directional ones under RTL. */
const ICONS = {
  back: { Glyph: ChevronLeft, mirror: true },
  check: { Glyph: Check, mirror: false },
  scan: { Glyph: ScanLine, mirror: false },
  sliders: { Glyph: SlidersHorizontal, mirror: false },
};

export function Icon({ name, size = 20, tint = color.text }: { name: keyof typeof ICONS; size?: number; tint?: string }) {
  const { Glyph, mirror } = ICONS[name];
  const style = mirror && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined;
  return <Glyph size={size} color={tint} strokeWidth={1.5} style={style} />;
}
