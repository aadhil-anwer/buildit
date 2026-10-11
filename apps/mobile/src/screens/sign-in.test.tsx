import { fireEvent, render, screen } from "@testing-library/react-native";
import * as auth from "@/auth/auth";
import { t } from "@/i18n";
import { Boundary } from "@/test/boundary";
import { SignIn } from "./sign-in";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock("@/auth/auth", () => ({ ...jest.requireActual<object>("@/auth/auth"), sendEmailCode: jest.fn(), verifyEmailCode: jest.fn() }));
const [send, verify] = [jest.mocked(auth.sendEmailCode), jest.mocked(auth.verifyEmailCode)];

const button = (key: Parameters<typeof t>[0]) => screen.getByRole("button", { name: t(key) });
async function toCodeStep() {
  await fireEvent.changeText(screen.getByLabelText(t("authEmailLabel")), "  a@b.co ");
  await fireEvent.press(button("authSend"));
  await screen.findByText(t("authCodeHint", "a@b.co"));
}
beforeEach(() => (send.mockResolvedValue(), verify.mockResolvedValue()));

test("asks for the email first, and an empty one is refused without calling the server", async () => {
  await render(<SignIn />);
  expect(screen.getByText(t("authEmailTitle"))).toBeTruthy();
  await fireEvent.press(button("authSend"));
  expect(screen.getByText(t("authBadEmail"))).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
});

test("sends a code to the trimmed address, then asks for the code", async () => {
  await render(<SignIn />);
  await toCodeStep();
  expect(send).toHaveBeenCalledWith("a@b.co");
  expect(screen.getByLabelText(t("authCodeLabel"))).toBeTruthy();
});

test("verifies the code for that address", async () => {
  await render(<SignIn />);
  await toCodeStep();
  await fireEvent.changeText(screen.getByLabelText(t("authCodeLabel")), "123456");
  await fireEvent.press(button("authVerify"));
  expect(verify).toHaveBeenCalledWith("a@b.co", "123456");
});

test("a wrong code says so and offers a new one", async () => {
  verify.mockRejectedValue({ code: "otp_expired", status: 403 });
  await render(<SignIn />);
  await toCodeStep();
  await fireEvent.changeText(screen.getByLabelText(t("authCodeLabel")), "000000");
  await fireEvent.press(button("authVerify"));
  expect(await screen.findByText(t("authBadCode"))).toBeTruthy();
  await fireEvent.press(button("authResend"));
  expect(send).toHaveBeenCalledTimes(2);
});

test("going back leaves the screen", async () => {
  await render(<SignIn />);
  await fireEvent.press(screen.getByRole("button", { name: t("back") }));
  expect(mockBack).toHaveBeenCalled();
});

test("a failure nobody can fix reaches the error boundary", async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  send.mockRejectedValue(new Error("mail server on fire"));
  await render(<Boundary><SignIn /></Boundary>);
  await fireEvent.changeText(screen.getByLabelText(t("authEmailLabel")), "a@b.co");
  await fireEvent.press(button("authSend"));
  expect(await screen.findByText("caught: mail server on fire")).toBeTruthy();
});
