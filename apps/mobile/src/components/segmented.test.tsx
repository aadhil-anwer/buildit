import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { color, withAlpha } from "@/theme";
import { Segmented } from "./segmented";

const options = [{ key: "a", label: "Standard" }, { key: "b", label: "Compact" }];
const opt = (name: string) => screen.getByRole("button", { name });
const selected = (name: string) => (opt(name).props as { accessibilityState: { selected: boolean } }).accessibilityState.selected;

test("shows every option with the chosen one selected", async () => {
  await render(<Segmented options={options} value="b" onChange={jest.fn()} />);
  expect([selected("Standard"), selected("Compact")]).toEqual([false, true]);
});

test("choosing another option reports its key; choosing the current one does nothing", async () => {
  const onChange = jest.fn();
  await render(<Segmented options={options} value="a" onChange={onChange} />);
  await fireEvent.press(opt("Standard"));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(opt("Compact"));
  expect(onChange).toHaveBeenCalledWith("b");
});

test("the selected option is tinted gold, with a 44pt tap target", async () => {
  await render(<Segmented options={options} value="a" onChange={jest.fn()} />);
  expect(StyleSheet.flatten(opt("Standard").props.style as object)).toMatchObject({ backgroundColor: withAlpha(color.accent, 0.16) });
  expect(StyleSheet.flatten(opt("Compact").props.style as object)).not.toHaveProperty("backgroundColor");
  expect(opt("Compact").props.hitSlop).toEqual({ top: 7, bottom: 7 });
});

test("an option can be set in its own script, and the text can be smaller", async () => {
  const face = (text: string) => (StyleSheet.flatten(screen.getByText(text).props.style as object) as { fontFamily: string; fontSize: number });
  await render(<Segmented options={[{ key: "ar", label: "العربية", arabic: true }, { key: "en", label: "English" }]} value="en" onChange={jest.fn()} small />);
  expect(face("العربية")).toMatchObject({ fontFamily: "NotoNaskhArabic_600SemiBold", fontSize: 13 });
  expect(face("English")).toMatchObject({ fontFamily: "Lora_600SemiBold", fontSize: 13 });
});
