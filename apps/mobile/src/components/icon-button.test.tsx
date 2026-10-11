import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { color } from "@/theme";
import { IconButton } from "./icon-button";

const button = () => screen.getByRole("button", { name: "Settings" });
const style = () => StyleSheet.flatten(button().props.style as object) as { width: number; height: number; borderRadius: number; borderColor: string };

test("is a 40px circle with a hairline, announced by its label, and presses", async () => {
  const onPress = jest.fn();
  await render(<IconButton icon="sliders" label="Settings" onPress={onPress} />);
  await fireEvent.press(button());
  expect(onPress).toHaveBeenCalled();
  expect(style()).toMatchObject({ width: 40, height: 40, borderRadius: 20, borderColor: color.divider });
});

test("keeps a 44pt tap target through its hit slop", async () => {
  await render(<IconButton icon="sliders" label="Settings" />);
  expect(button().props.hitSlop).toBe(2);
});

test("the quiet variant has no visible border", async () => {
  await render(<IconButton icon="sliders" label="Settings" quiet />);
  expect(style().borderColor).toBe("transparent");
});
