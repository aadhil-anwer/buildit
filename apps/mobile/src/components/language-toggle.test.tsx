import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import * as i18n from "@/i18n";
import { Boundary } from "@/test/boundary";
import { LanguageToggle } from "./language-toggle";

const english = () => screen.getByRole("button", { name: "English" });
const arabic = () => screen.getByRole("button", { name: "العربية" });
const selected = (el: ReturnType<typeof english>) => (el.props as { accessibilityState: { selected: boolean } }).accessibilityState.selected;

beforeEach(() => jest.spyOn(i18n, "setLanguage").mockResolvedValue());

test("shows both languages, each in its own, with the current one selected", async () => {
  jest.spyOn(i18n, "isArabic").mockReturnValue(false);
  await render(<LanguageToggle />);
  expect([selected(english()), selected(arabic())]).toEqual([true, false]);
});

test("choosing the other language switches to it; choosing the current one does nothing", async () => {
  jest.spyOn(i18n, "isArabic").mockReturnValue(false);
  await render(<LanguageToggle />);
  await fireEvent.press(english());
  expect(i18n.setLanguage).not.toHaveBeenCalled();
  await fireEvent.press(arabic());
  expect(i18n.setLanguage).toHaveBeenCalledWith("ar");
});

test("a failure to switch reaches the error boundary", async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(i18n, "isArabic").mockReturnValue(false);
  jest.spyOn(i18n, "setLanguage").mockRejectedValue(new Error("disk full"));
  await render(<Boundary><LanguageToggle /></Boundary>);
  await fireEvent.press(arabic());
  expect(await screen.findByText("caught: disk full")).toBeTruthy();
});

test("each label is set in its own script, whatever the app language", async () => {
  const face = (text: string) => (StyleSheet.flatten(screen.getByText(text).props.style as object) as { fontFamily: string }).fontFamily;
  for (const arabicUi of [false, true]) {
    jest.spyOn(i18n, "isArabic").mockReturnValue(arabicUi);
    await render(<LanguageToggle />);
    expect([face("English"), face("العربية")]).toEqual(["Lora_600SemiBold", "NotoNaskhArabic_600SemiBold"]);
  }
});
