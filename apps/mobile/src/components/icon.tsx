import ArrowLeftRight from "lucide-react-native/icons/arrow-left-right";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Lock from "lucide-react-native/icons/lock";
import LockOpen from "lucide-react-native/icons/lock-open";
import Redo2 from "lucide-react-native/icons/redo-2";
import RotateCcwClock from "lucide-react-native/icons/rotate-ccw-clock";
import RotateCw from "lucide-react-native/icons/rotate-cw";
import Trash from "lucide-react-native/icons/trash";
import Undo2 from "lucide-react-native/icons/undo-2";
import X from "lucide-react-native/icons/x";
import Check from "lucide-react-native/icons/check";
import Minus from "lucide-react-native/icons/minus";
import Plus from "lucide-react-native/icons/plus";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import LogOut from "lucide-react-native/icons/log-out";
import ScanLine from "lucide-react-native/icons/scan-line";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import { isArabic } from "@/i18n";
import { RingDot } from "./glyphs";
import { color } from "@/theme";

/** Icons are named for what they mean; `mirror` flips directional ones under RTL. */
const ICONS = {
  back: { Glyph: ChevronLeft, mirror: true },
  check: { Glyph: Check, mirror: false },
  close: { Glyph: X, mirror: false },
  dot: { Glyph: RingDot, mirror: false },
  delete: { Glyph: Trash, mirror: false },
  lock: { Glyph: Lock, mirror: false },
  next: { Glyph: ChevronRight, mirror: true },
  redo: { Glyph: Redo2, mirror: true },
  rotate: { Glyph: RotateCw, mirror: false },
  send: { Glyph: ArrowUp, mirror: false },
  undo: { Glyph: Undo2, mirror: true },
  unlock: { Glyph: LockOpen, mirror: false },
  versions: { Glyph: RotateCcwClock, mirror: false },
  walk: { Glyph: ArrowLeftRight, mirror: false },
  logout: { Glyph: LogOut, mirror: true },
  minus: { Glyph: Minus, mirror: false },
  plus: { Glyph: Plus, mirror: false },
  scan: { Glyph: ScanLine, mirror: false },
  sliders: { Glyph: SlidersHorizontal, mirror: false },
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, tint = color.text }: { name: IconName; size?: number; tint?: string }) {
  const { Glyph, mirror } = ICONS[name];
  const style = mirror && isArabic() ? { transform: [{ scaleX: -1 }] } : undefined;
  return <Glyph size={size} color={tint} strokeWidth={1.5} style={style} />;
}
