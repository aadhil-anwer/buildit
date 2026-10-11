import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
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
