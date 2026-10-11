import { fireEvent, render, screen } from "@testing-library/react-native";
import { ConfirmDialog } from "./confirm-dialog";

const props = { visible: true, title: "Delete everything?", body: "This can't be undone.", cancelLabel: "Cancel", confirmLabel: "Delete" };

test("asks the question and offers both ways out", async () => {
  const [onCancel, onConfirm] = [jest.fn(), jest.fn()];
  await render(<ConfirmDialog {...props} onCancel={onCancel} onConfirm={onConfirm} />);
  expect(screen.getByText("Delete everything?")).toBeTruthy();
  expect(screen.getByText("This can't be undone.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test("shows nothing when it is not visible", async () => {
  await render(<ConfirmDialog {...props} visible={false} onCancel={jest.fn()} onConfirm={jest.fn()} />);
  expect(screen.queryByText("Delete everything?")).toBeNull();
});

test("shows what went wrong under the question", async () => {
  await render(<ConfirmDialog {...props} error="Couldn't delete." onCancel={jest.fn()} onConfirm={jest.fn()} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Couldn't delete.");
});

test("while working it cannot be confirmed twice", async () => {
  const onConfirm = jest.fn();
  await render(<ConfirmDialog {...props} busy onCancel={jest.fn()} onConfirm={onConfirm} />);
  await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  expect(onConfirm).not.toHaveBeenCalled();
});
