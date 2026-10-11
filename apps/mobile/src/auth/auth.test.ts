import { supabase } from "@/lib/supabase";
import { authErrorKey, sendEmailCode, signInAnonymously, signOut, verifyEmailCode } from "./auth";

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { signInAnonymously: jest.fn(), signInWithOtp: jest.fn(), verifyOtp: jest.fn(), signOut: jest.fn() } },
}));
const auth = supabase.auth as unknown as Record<"signInAnonymously" | "signInWithOtp" | "verifyOtp" | "signOut", jest.Mock>;
beforeEach(() => Object.values(auth).forEach((f) => f.mockResolvedValue({ error: null })));

test("each call goes to the right Supabase method with the right arguments", async () => {
  await signInAnonymously();
  await sendEmailCode("a@b.co");
  await verifyEmailCode("a@b.co", "123456");
  await signOut();
  expect(auth.signInAnonymously).toHaveBeenCalledWith();
  expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: "a@b.co" });
  expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "a@b.co", token: "123456", type: "email" });
  expect(auth.signOut).toHaveBeenCalledWith();
});

test.each([
  ["signInAnonymously", () => signInAnonymously()],
  ["signInWithOtp", () => sendEmailCode("a@b.co")],
  ["verifyOtp", () => verifyEmailCode("a@b.co", "1")],
  ["signOut", () => signOut()],
])("%s failing rejects with the very same error", async (method, call) => {
  const error = new Error("nope");
  auth[method as keyof typeof auth].mockResolvedValue({ error });
  await expect(call()).rejects.toBe(error);
});

test.each([
  [{ name: "AuthRetryableFetchError", status: 0 }, "authOffline"],
  [{ code: "otp_expired", status: 403 }, "authBadCode"],
  [{ code: "validation_failed", status: 400 }, "authBadEmail"],
  [{ code: "email_address_invalid", status: 400 }, "authBadEmail"],
  [{ code: "over_email_send_rate_limit", status: 429 }, "authRate"],
])("%j shows %s", (error, key) => expect(authErrorKey(error)).toBe(key));

test("an error it does not recognise has no message, so callers must rethrow it", () => {
  expect(authErrorKey({ code: "unexpected_failure", status: 500 })).toBeUndefined();
  expect(authErrorKey(new Error("boom"))).toBeUndefined();
  expect(authErrorKey("text")).toBeUndefined();
});
