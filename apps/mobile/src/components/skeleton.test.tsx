import { render, screen } from "@testing-library/react-native";
import { Skeleton } from "./skeleton";

test("is announced as loading to screen readers", async () => {
  await render(<Skeleton label="Loading rooms" />);
  expect(screen.getByRole("progressbar", { name: "Loading rooms" })).toBeTruthy();
});
