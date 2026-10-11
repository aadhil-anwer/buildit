import { fireEvent, render, screen } from "@testing-library/react-native";
import * as reporter from "@/lib/report";
import { ErrorScreen } from "./error-screen";

test("reports the error once and offers a way forward", async () => {
  const spy = jest.spyOn(reporter, "report").mockImplementation(() => undefined);
  const retry = jest.fn();
  const err = new Error("boom");
  await render(<ErrorScreen error={err} retry={retry} />);
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(err, { screen: "error-boundary" });
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalled();
  expect(screen.getByText("Something went wrong")).toBeTruthy();
});
