import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { color } from "@/theme";
import { Tag } from "./tag";

test("is a small accent-tinted label with dark gold text", async () => {
  await render(<Tag>Recommended</Tag>);
  const label = StyleSheet.flatten(screen.getByText("Recommended").props.style as object) as { color: string; fontSize: number };
  expect(label).toMatchObject({ color: color.accent800, fontSize: 11 });
  const box = StyleSheet.flatten(screen.getByText("Recommended").parent?.props.style as object) as { backgroundColor: string; borderRadius: number };
  expect(box).toMatchObject({ backgroundColor: color.accent100, borderRadius: 3 });
});
