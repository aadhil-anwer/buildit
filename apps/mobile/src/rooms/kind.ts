import type { RoomKind } from "@buildit/core";
import { t, type StringKey } from "@/i18n";

const NAME: Record<RoomKind, StringKey> = { bedroom: "kindBedroom", living: "kindLiving", majlis: "kindMajlis", office: "kindOffice" };

/** "Bedroom", "غرفة نوم"... */
export const kindName = (kind: RoomKind) => t(NAME[kind]);

// Words people use for each kind of room, English and Arabic (Gulf usage included). Matched anywhere in the name.
const WORDS: [RoomKind, RegExp][] = [
  ["bedroom", /\b(bed|bedroom|master|kids?|nursery|guest\s*bed)|نوم|أطفال|اطفال/i],
  ["majlis", /\b(majlis|majles|diwan|diwaniya|diwaniyah)\b|مجلس|ديوانية|ضيوف/i],
  ["office", /\b(office|study|work|desk)\b|مكتب|دراسة/i],
  ["living", /\b(living|lounge|family|sitting|salon|tv)\b|معيشة|جلوس|صالة|صالون/i],
];

/** The kind a room's name suggests ("Master bed" → bedroom, "مجلس الرجال" → majlis), or null when it says nothing. */
export function kindFromName(name: string): RoomKind | null {
  return WORDS.find(([, re]) => re.test(name))?.[0] ?? null;
}
