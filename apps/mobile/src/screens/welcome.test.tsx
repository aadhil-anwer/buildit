import { fireEvent, render, screen } from "@testing-library/react-native";
import * as auth from "@/auth/auth";
import { t } from "@/i18n";
import { Boundary } from "@/test/boundary";
import { Welcome } from "./welcome";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/auth/auth", () => ({ ...jest.requireActual<object>("@/auth/auth"), signInAnonymously: jest.fn() }));
const guest = () => screen.getByRole("button", { name: t("wTry") });

beforeEach(() => jest.mocked(auth.signInAnonymously).mockResolvedValue());

test("shows the design's brand, promise and ways in (Apple waits for its configuration)", async () => {
  await render(<Welcome />);
  for (const key of ["brand", "wTitle", "wSub"] as const) expect(screen.getByText(t(key))).toBeTruthy();
  expect(screen.getByRole("button", { name: t("wEmail") })).toBeTruthy();
  expect(guest()).toBeTruthy();
  expect(screen.queryByText(t("wApple"))).toBeNull();
});

test("email opens the sign-in screen", async () => {
  await render(<Welcome />);
  await fireEvent.press(screen.getByRole("button", { name: t("wEmail") }));
  expect(mockPush).toHaveBeenCalledWith("/sign-in");
});

test("trying without an account signs in anonymously", async () => {
  await render(<Welcome />);
  await fireEvent.press(guest());
  expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
});

test("offline: says so and what to do, and stays put", async () => {
  jest.mocked(auth.signInAnonymously).mockRejectedValue({ name: "AuthRetryableFetchError", status: 0 });
  await render(<Welcome />);
  await fireEvent.press(guest());
  expect(await screen.findByText(t("authOffline"))).toBeTruthy();
});

test("a failure nobody can fix reaches the error boundary instead of being hidden", async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.mocked(auth.signInAnonymously).mockRejectedValue(new Error("database exploded"));
  await render(<Boundary><Welcome /></Boundary>);
  await fireEvent.press(guest());
  expect(await screen.findByText("caught: database exploded")).toBeTruthy();
});
