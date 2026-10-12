import { fireEvent, render, screen } from "@testing-library/react-native";
import { SheetTabs } from "./sheet-tabs";

const tabs = [{ key: "ask", label: "Ask" }, { key: "add", label: "Add" }] as const;

test("marks the chosen tab and changes to another", async () => {
  const onChange = jest.fn();
  await render(<SheetTabs tabs={[...tabs]} value="ask" onChange={onChange} />);
  expect((screen.getByRole("tab", { name: "Ask" }).props as { accessibilityState: { selected: boolean } }).accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole("tab", { name: "Add" }));
  expect(onChange).toHaveBeenCalledWith("add");
});
