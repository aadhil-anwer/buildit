import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import { getLocales } from "expo-localization";
import { I18nManager } from "react-native";
import { formatNumber, initI18n, isArabic, setLanguage, t } from ".";
import { strings } from "./strings";

jest.mock("expo-localization", () => ({ getLocales: jest.fn() }));
jest.mock("expo", () => ({ ...jest.requireActual<object>("expo"), reloadAppAsync: jest.fn() }));

const device = (code: string) => (getLocales as jest.Mock).mockReturnValue([{ languageCode: code }]);
const rtl = (on: boolean) => jest.replaceProperty(I18nManager, "isRTL", on);
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  device("en");
  rtl(false);
  jest.spyOn(I18nManager, "forceRTL").mockImplementation(() => undefined);
});

test("English with typed placeholders", async () => {
  await initI18n();
  expect(t("left", 17, 20)).toBe("17 of 20 requests left today");
});

test("a wrong call is a type error and also fails loudly at runtime", () => {
  // @ts-expect-error "left" needs two values
  expect(() => t("left", 17)).toThrow(/needs a value/);
  // @ts-expect-error "retry" takes none
  expect(t("retry", 1)).toBe("Try again");
  // @ts-expect-error not a real string key
  expect(() => t("nope")).toThrow(/missing string/);
});

test("Arabic uses Arabic-Indic digits and the Arabic decimal mark; names pass through", () => {
  expect(formatNumber(4.5, "ar")).toBe("٤٫٥");
  expect(formatNumber(1204, "ar")).toBe("١٢٠٤");
  expect(formatNumber("Aya", "ar")).toBe("Aya");
  expect(formatNumber(4.5, "en")).toBe("4.5");
});

test.each([["a saved choice", "ar", "en", "ar"], ["the device language", undefined, "ar", "ar"], ["English for other languages", undefined, "fr", "en"]])(
  "picks %s",
  async (_n, saved, deviceLang, expected) => {
    if (saved) await AsyncStorage.setItem("language", saved);
    device(deviceLang);
    await initI18n();
    expect(t("retry")).toBe(strings[expected as "en" | "ar"].retry);
  },
);

test("switches the layout direction and reloads only when it has to", async () => {
  await AsyncStorage.setItem("language", "ar");
  await initI18n();
  expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
  expect(reloadAppAsync).toHaveBeenCalledTimes(1);
  jest.clearAllMocks();
  rtl(true);
  await initI18n();
  expect(reloadAppAsync).not.toHaveBeenCalled();
});

test("setLanguage saves the choice, flips direction and reloads", async () => {
  await setLanguage("ar");
  expect(await AsyncStorage.getItem("language")).toBe("ar");
  expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
  expect(reloadAppAsync).toHaveBeenCalled();
});

test("a storage failure reaches the caller instead of being swallowed", async () => {
  jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));
  await expect(setLanguage("ar")).rejects.toThrow("disk full");
  expect(reloadAppAsync).not.toHaveBeenCalled();
});

test("every string has the same placeholders in English and Arabic", () => {
  const slots = (s: string) => [...new Set(s.match(/\{\d+\}/g) ?? [])].sort().join();
  for (const key of Object.keys(strings.en) as (keyof typeof strings.en)[]) expect(slots(strings.ar[key])).toBe(slots(strings.en[key]));
});

test("isArabic follows the chosen language", async () => {
  await initI18n();
  expect(isArabic()).toBe(false);
  await AsyncStorage.setItem("language", "ar");
  await initI18n();
  expect(isArabic()).toBe(true);
});
