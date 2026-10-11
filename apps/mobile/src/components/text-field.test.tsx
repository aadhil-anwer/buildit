import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { color } from "@/theme";
import { TextField } from "./text-field";

const input = () => screen.getByLabelText("Email address");
const border = () => (StyleSheet.flatten(input().props.style as object) as { borderColor: string; minHeight: number });

test("is labelled for screen readers, passes typing through, and is a 44pt target", async () => {
  const onChangeText = jest.fn();
  await render(<TextField label="Email address" onChangeText={onChangeText} />);
  await fireEvent.changeText(input(), "a@b.co");
  expect(onChangeText).toHaveBeenCalledWith("a@b.co");
  expect(border().minHeight).toBeGreaterThanOrEqual(44);
});

test("the border is a hairline until focused, then the accent", async () => {
  await render(<TextField label="Email address" />);
  expect(border().borderColor).toBe(color.divider);
  await fireEvent(input(), "focus");
  expect(border().borderColor).toBe(color.accent);
});

test("an error is shown under the field and announced", async () => {
  await render(<TextField label="Email address" error="Check it and try again." />);
  expect(screen.getByRole("alert")).toHaveTextContent("Check it and try again.");
});
