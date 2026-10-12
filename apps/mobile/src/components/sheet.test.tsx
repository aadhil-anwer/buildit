import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { t } from "@/i18n";
import { Sheet } from "./sheet";

test("shows its content under a grabber", async () => {
  await render(<Sheet snap="half" onSnapChange={jest.fn()}><Text>body</Text></Sheet>);
  expect(screen.getByText("body")).toBeTruthy();
  expect(screen.getByRole("button", { name: t("sheetResize") })).toBeTruthy();
});

test("the grabber moves to the next size for people using a screen reader", async () => {
  const onSnapChange = jest.fn();
  await render(<Sheet snap="half" onSnapChange={onSnapChange}><Text>body</Text></Sheet>);
  await fireEvent(screen.getByRole("button", { name: t("sheetResize") }), "accessibilityTap");
  expect(onSnapChange).toHaveBeenCalledWith("full");
});
