import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import * as i18n from "@/i18n";
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

test("uses the Arabic faces and no letter-spacing when the language is Arabic", async () => {
  jest.spyOn(i18n, "isArabic").mockReturnValue(true);
  await render(<Text variant="display">Hi</Text>);
  expect(styleOf()).toMatchObject({ fontFamily: "Amiri_400Regular", letterSpacing: 0 });
});

test("a label can be forced into one script regardless of the app language", async () => {
  jest.spyOn(i18n, "isArabic").mockReturnValue(false);
  await render(<Text arabic>Hi</Text>);
  expect(styleOf().fontFamily).toBe("NotoNaskhArabic_400Regular");
});
