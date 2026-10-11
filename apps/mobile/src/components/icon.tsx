import Check from "lucide-react-native/icons/check";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ScanLine from "lucide-react-native/icons/scan-line";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import { isArabic } from "@/i18n";
import { color } from "@/theme";

/** Icons are named for what they mean; `mirror` flips directional ones under RTL. */
const ICONS = {
  back: { Glyph: ChevronLeft, mirror: true },
  check: { Glyph: Check, mirror: false },
  scan: { Glyph: ScanLine, mirror: false },
  sliders: { Glyph: SlidersHorizontal, mirror: false },
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, tint = color.text }: { name: IconName; size?: number; tint?: string }) {
  const { Glyph, mirror } = ICONS[name];
  const style = mirror && isArabic() ? { transform: [{ scaleX: -1 }] } : undefined;
  return <Glyph size={size} color={tint} strokeWidth={1.5} style={style} />;
}
