import { sampleBedroom } from "@buildit/core";
import { supabase } from "@/lib/supabase";
import { useRooms } from "@/rooms/store";
import { deleteAccount } from "./delete-account";
import { useSettings } from "./store";

jest.mock("@/lib/supabase", () => ({ supabase: { rpc: jest.fn(), auth: { signOut: jest.fn() } } }));
const mocked = supabase as unknown as { rpc: jest.Mock; auth: { signOut: jest.Mock } };
const [rpc, signOut] = [mocked.rpc, mocked.auth.signOut];
beforeEach(() => {
  useRooms.setState({ rooms: [{ id: "r", name: "Bedroom", scene: sampleBedroom(), updatedAt: 1, dirty: false }] });
  useSettings.setState({ walkwayCm: 75 });
  signOut.mockResolvedValue({ error: null });
});

test("deletes the account on the server, then clears this device and signs out locally", async () => {
  rpc.mockResolvedValue({ error: null });
  await deleteAccount();
  expect(rpc).toHaveBeenCalledWith("delete_account");
  expect(useRooms.getState().rooms).toEqual([]);
  expect(useSettings.getState().walkwayCm).toBe(90);
  expect(signOut).toHaveBeenCalledWith({ scope: "local" });
});

test("if the server cannot delete, nothing on this device is touched and the error is raised", async () => {
  const error = new Error("offline");
  rpc.mockResolvedValue({ error });
  await expect(deleteAccount()).rejects.toBe(error);
  expect(useRooms.getState().rooms).toHaveLength(1);
  expect(useSettings.getState().walkwayCm).toBe(75);
  expect(signOut).not.toHaveBeenCalled();
});
