import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { supabase } from "@/lib/supabase";
import { SessionProvider, useSession } from "./session";

jest.mock("@/lib/supabase", () => ({ supabase: { auth: { onAuthStateChange: jest.fn() } } }));
const onChange = (supabase.auth as unknown as { onAuthStateChange: jest.Mock }).onAuthStateChange;

function Probe() {
  const session = useSession();
  return <Text>{session === undefined ? "loading" : session === null ? "signed out" : `user ${session.user.id}`}</Text>;
}

test("is loading until Supabase reports, then follows sign-in and sign-out; unsubscribes on unmount", async () => {
  let notify: (...args: unknown[]) => void = () => undefined;
  const unsubscribe = jest.fn();
  onChange.mockImplementation((cb: typeof notify) => ((notify = cb), { data: { subscription: { unsubscribe } } }));
  const { unmount } = await render(<SessionProvider><Probe /></SessionProvider>);
  expect(screen.getByText("loading")).toBeTruthy();
  await act(() => notify("INITIAL_SESSION", null));
  expect(screen.getByText("signed out")).toBeTruthy();
  await act(() => notify("SIGNED_IN", { user: { id: "u1" } }));
  expect(screen.getByText("user u1")).toBeTruthy();
  await unmount();
  expect(unsubscribe).toHaveBeenCalled();
});
