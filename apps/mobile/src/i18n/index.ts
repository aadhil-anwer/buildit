import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import { getLocales } from "expo-localization";
import { I18nManager } from "react-native";
import { strings } from "./strings";

export type Lang = "en" | "ar";
type Key = keyof typeof strings.en;
/** One entry per `{n}` in the English string, so a wrong number of values is a type error. */
type Slots<S extends string, I extends unknown[] = []> = S extends `${string}{${I["length"]}}${string}` ? Slots<S, [...I, 0]> : I;
type Fill<T extends unknown[]> = { [P in keyof T]: string | number };
type Values<K extends Key> = Fill<Slots<(typeof strings.en)[K]>>;

// Switching language reloads the app (RTL only applies after a reload), so this never changes while running.
let lang: Lang = "en";

/** Numbers follow the language: Arabic-Indic digits and the Arabic decimal mark. Strings pass through. */
export const formatNumber = (value: number | string, l: Lang = lang) =>
  typeof value === "number" && l === "ar" ? String(value).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]).replace(".", "٫") : String(value);

export function t<K extends Key>(key: K, ...values: Values<K>): string {
  const text = strings[lang][key] as string | undefined; // JS callers can still pass a bad key
  if (text === undefined) throw new Error(`missing string "${key}"`);
  const list = values as (string | number | undefined)[];
  return text.replace(/\{(\d+)\}/g, (_, i: string) => {
    const value = list[Number(i)];
    if (value === undefined) throw new Error(`"${key}" needs a value for {${i}}`);
    return formatNumber(value);
  });
}

async function applyDirection(l: Lang) {
  const rtl = l === "ar";
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL === rtl) return;
  I18nManager.forceRTL(rtl);
  await reloadAppAsync();
}

/** Call once before the first screen: saved choice, else the device language, else English. */
export async function initI18n() {
  const saved = await AsyncStorage.getItem("language");
  lang = saved === "en" || saved === "ar" ? saved : getLocales()[0]?.languageCode === "ar" ? "ar" : "en";
  await applyDirection(lang);
}

export async function setLanguage(l: Lang) {
  await AsyncStorage.setItem("language", l);
  lang = l;
  await applyDirection(l);
}
