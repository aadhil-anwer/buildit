import { fireEvent, render, screen } from "@testing-library/react-native";
import type { Rule } from "@buildit/core";
import { t } from "@/i18n";
import { RoomCheckChip } from "./room-check-chip";

const rule = (id: Rule["id"], status: Rule["status"], cm?: number): Rule => ({ id, status, weight: 1, cm, objectIds: [] });

test("says all rules pass when none fail, with the score", async () => {
  await render(<RoomCheckChip score={100} rules={[rule("walkway", "pass", 90)]} onPress={jest.fn()} />);
  expect(screen.getByText(t("allOk"))).toBeTruthy();
  expect(screen.getByRole("button", { name: `${t("check")}. 100. ${t("allOk")}` })).toBeTruthy();
});

test("leads with the first thing that needs attention, and opens the check when pressed", async () => {
  const onPress = jest.fn();
  await render(<RoomCheckChip score={78} rules={[rule("walkway", "pass", 90), rule("bed", "tight", 55)]} onPress={onPress} />);
  expect(screen.getByText(t("sBed", 55))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button"));
  expect(onPress).toHaveBeenCalled();
});
