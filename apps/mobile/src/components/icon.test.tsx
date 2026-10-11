import { render, screen } from "@testing-library/react-native";
import * as i18n from "@/i18n";
import { Icon } from "./icon";

const mirrored = () => JSON.stringify(screen.toJSON()).includes('"scaleX":-1');

test.each([[true, true], [false, false]])("back arrow mirrored=%s when RTL=%s", async (rtl, expected) => {
  jest.spyOn(i18n, "isArabic").mockReturnValue(rtl);
  await render(<Icon name="back" />);
  expect(mirrored()).toBe(expected);
});

test("non-directional icons never mirror", async () => {
  jest.spyOn(i18n, "isArabic").mockReturnValue(true);
  await render(<Icon name="check" />);
  expect(mirrored()).toBe(false);
});
