import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { color } from "@/theme";
import { Chip } from "./chip";

const chip = () => screen.getByRole("button", { name: "Cosy" });
const border = () => (StyleSheet.flatten(chip().props.style as object) as { borderColor: string; borderRadius: number });

test("is a pill that reports selection and presses", async () => {
  const onPress = jest.fn();
  await render(<Chip label="Cosy" selected onPress={onPress} />);
  await fireEvent.press(chip());
  expect(onPress).toHaveBeenCalled();
  expect((chip().props as { accessibilityState: object }).accessibilityState).toMatchObject({ selected: true });
  expect(border()).toMatchObject({ borderRadius: 99, borderColor: color.accent });
});

test("unselected chips use the hairline colour and keep a 44pt tap target", async () => {
  await render(<Chip label="Cosy" />);
  expect(border().borderColor).toBe(color.divider);
  const { minHeight } = StyleSheet.flatten(chip().props.style as object) as { minHeight: number };
  const slop = chip().props.hitSlop as { top: number; bottom: number };
  expect(minHeight + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
});
