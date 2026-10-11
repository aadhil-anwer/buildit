import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { color } from "@/theme";
import { Text } from "./text";

const styleOf = () => StyleSheet.flatten(screen.getByText("Hi").props.style as object) as Record<string, unknown>;

test("defaults to the body variant in the text colour", async () => {
  await render(<Text>Hi</Text>);
  expect(styleOf()).toMatchObject({ fontFamily: "Lora_400Regular", color: color.text });
});

test("accent text uses the dark accent step, never the plain accent (contrast)", async () => {
  await render(<Text tone="accent">Hi</Text>);
  expect(styleOf().color).toBe(color.accent700);
});
