import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { color, rust } from "@/theme";
import { Button } from "./button";

const button = () => screen.getByRole("button", { name: "Scan a room" });

test("calls onPress and is at least 44pt tall", async () => {
  const onPress = jest.fn();
  await render(<Button title="Scan a room" onPress={onPress} />);
  await fireEvent.press(button());
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(button().props.style as object)).toMatchObject({ minHeight: 44 });
});

test.each([["disabled"], ["busy"]])("%s does not fire and is announced as such", async (flag) => {
  const onPress = jest.fn();
  await render(<Button title="Scan a room" onPress={onPress} {...{ [flag]: true }} />);
  await fireEvent.press(button());
  expect(onPress).not.toHaveBeenCalled();
  expect((button().props as { accessibilityState: object }).accessibilityState).toMatchObject({ [flag]: true });
});

test.each([[14, 44], [15, 44], [16, 46], [17, 50]] as const)("a %ipx button is %i tall (never under the 44pt tap target)", async (size, height) => {
  await render(<Button title="Scan a room" size={size} />);
  expect(StyleSheet.flatten(button().props.style as object)).toMatchObject({ minHeight: height });
  expect(StyleSheet.flatten(screen.getByText("Scan a room").props.style as object)).toMatchObject({ fontSize: size, letterSpacing: 0 });
});

test("the danger variant is outlined and labelled in rust", async () => {
  await render(<Button title="Delete" variant="danger" />);
  expect(StyleSheet.flatten(screen.getByRole("button", { name: "Delete" }).props.style as object)).toMatchObject({ borderColor: rust.base });
  expect(StyleSheet.flatten(screen.getByText("Delete").props.style as object)).toMatchObject({ color: rust.dark });
  expect(color.bg).toBeTruthy();
});
