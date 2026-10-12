import { fireEvent, render, screen, within } from "@testing-library/react-native";
import * as auth from "@/auth/auth";
import { t } from "@/i18n";
import { deleteAccount } from "@/settings/delete-account";
import { useSettings } from "@/settings/store";
import { Settings } from "./settings";

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockSession: { user: { email?: string } } | null = { user: { email: "noor@example.com" } };
let mockUsage: { usage?: { used: number; limit: number; resetsAt: Date }; failed: boolean } = { usage: { used: 3, limit: 20, resetsAt: new Date() }, failed: false };
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack, push: mockPush }) }));
jest.mock("@/auth/session", () => ({ useSession: () => mockSession }));
jest.mock("@/auth/auth", () => ({ ...jest.requireActual<object>("@/auth/auth"), signOut: jest.fn() }));
jest.mock("@/settings/use-ai-usage", () => ({ useAiUsage: () => mockUsage }));
jest.mock("@/settings/delete-account", () => ({ deleteAccount: jest.fn() }));
const button = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  mockSession = { user: { email: "noor@example.com" } };
  mockUsage = { usage: { used: 3, limit: 20, resetsAt: new Date() }, failed: false };
  useSettings.setState({ walkwayCm: 90 });
  jest.mocked(auth.signOut).mockResolvedValue();
  jest.mocked(deleteAccount).mockResolvedValue();
});

test("has the design's sections: language, walkway, AI usage, account", async () => {
  await render(<Settings />);
  for (const key of ["setH", "langL", "walkPref", "aiUse", "account"] as const) expect(screen.getByText(t(key))).toBeTruthy();
  expect(screen.getByText("noor@example.com")).toBeTruthy();
});

test("the walkway preference shows the current choice and changes it", async () => {
  await render(<Settings />);
  expect((button(t("std")).props as { accessibilityState: { selected: boolean } }).accessibilityState.selected).toBe(true);
  await fireEvent.press(button(t("compact")));
  expect(useSettings.getState().walkwayCm).toBe(75);
});

test("shows how many AI requests are used today", async () => {
  await render(<Settings />);
  expect(screen.getByText(t("used", 3, 20))).toBeTruthy();
});

test("if usage cannot be loaded it says so and what will happen", async () => {
  mockUsage = { failed: true };
  await render(<Settings />);
  expect(screen.getByText(t("usageFail"))).toBeTruthy();
});

test.each([[undefined], [""]])("a guest has no email (Supabase sends %j), and the screen says so", async (email) => {
  mockSession = { user: { email } };
  await render(<Settings />);
  expect(screen.getByText(t("guestAccount"))).toBeTruthy();
});

test("a guest is asked before signing out, because there is no way back into a guest account", async () => {
  mockSession = { user: { email: "" } };
  await render(<Settings />);
  await fireEvent.press(button(t("signout")));
  expect(screen.getByText(t("guestOutH"))).toBeTruthy();
  expect(auth.signOut).not.toHaveBeenCalled();
  await fireEvent.press(button(t("cancel")));
  expect(screen.queryByText(t("guestOutH"))).toBeNull();
  await fireEvent.press(button(t("signout")));
  await fireEvent.press(within(screen.getByText(t("guestOutH")).parent!.parent!).getByRole("button", { name: t("signout") }));
  expect(auth.signOut).toHaveBeenCalledTimes(1);
});

test("signing out calls sign out", async () => {
  await render(<Settings />);
  await fireEvent.press(button(t("signout")));
  expect(auth.signOut).toHaveBeenCalledTimes(1);
});

test("deleting asks first; cancel leaves everything alone", async () => {
  await render(<Settings />);
  await fireEvent.press(button(t("delAcc")));
  expect(screen.getByText(t("delH"))).toBeTruthy();
  expect(screen.getByText(t("delP"))).toBeTruthy();
  await fireEvent.press(button(t("cancel")));
  expect(screen.queryByText(t("delH"))).toBeNull();
  expect(deleteAccount).not.toHaveBeenCalled();
});

test("confirming deletes the account", async () => {
  await render(<Settings />);
  await fireEvent.press(button(t("delAcc")));
  await fireEvent.press(within(screen.getByText(t("delH")).parent!.parent!).getByRole("button", { name: t("delConf") }));
  expect(deleteAccount).toHaveBeenCalledTimes(1);
});

test("if deleting fails the dialog stays, says why, and nothing is lost", async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.mocked(deleteAccount).mockRejectedValue(new Error("offline"));
  await render(<Settings />);
  await fireEvent.press(button(t("delAcc")));
  await fireEvent.press(button(t("delConf")));
  expect(await screen.findByText(t("delFail"))).toBeTruthy();
  expect(screen.getByText(t("delH"))).toBeTruthy();
});

test("back leaves the screen", async () => {
  await render(<Settings />);
  await fireEvent.press(button(t("back")));
  expect(mockBack).toHaveBeenCalled();
});

test("a guest can add an email to keep the account, and a signed-in user is not offered it", async () => {
  mockSession = { user: {} };
  const guest = await render(<Settings />);
  await fireEvent.press(button(t("upgradeGuest")));
  expect(mockPush).toHaveBeenCalledWith("/sign-in?upgrade=1");
  await guest.unmount();
  mockSession = { user: { email: "noor@example.com" } };
  await render(<Settings />);
  expect(screen.queryByText(t("upgradeGuest"))).toBeNull();
});
