import { render, screen } from "@testing-library/react-native";
import { I18nManager } from "react-native";
import { Icon } from "./icon";

const mirrored = () => JSON.stringify(screen.toJSON()).includes('"scaleX":-1');

test.each([[true, true], [false, false]])("back arrow mirrored=%s when RTL=%s", async (rtl, expected) => {
  jest.replaceProperty(I18nManager, "isRTL", rtl);
  await render(<Icon name="back" />);
  expect(mirrored()).toBe(expected);
});

test("non-directional icons never mirror", async () => {
  jest.replaceProperty(I18nManager, "isRTL", true);
  await render(<Icon name="check" />);
  expect(mirrored()).toBe(false);
});
