import { renderHook, waitFor } from "@testing-library/react-native";
import * as reporter from "@/lib/report";
import { supabase } from "@/lib/supabase";
import { useAiUsage } from "./use-ai-usage";

jest.mock("@/lib/supabase", () => ({ supabase: { rpc: jest.fn() } }));
const rpc = (supabase as unknown as { rpc: jest.Mock }).rpc;

test("reads today's usage from the server", async () => {
  rpc.mockResolvedValue({ data: [{ used: 3, daily_limit: 20, resets_at: "2026-10-13T20:00:00Z" }], error: null });
  const { result } = await renderHook(() => useAiUsage());
  await waitFor(() => expect(result.current.usage).toEqual({ used: 3, limit: 20, resetsAt: new Date("2026-10-13T20:00:00Z") }));
  expect(rpc).toHaveBeenCalledWith("ai_usage_today");
  expect(result.current.failed).toBe(false);
});

test("a failed request is reported and flagged so the screen can say so", async () => {
  const report = jest.spyOn(reporter, "report").mockImplementation(() => undefined);
  rpc.mockResolvedValue({ data: null, error: new Error("offline") });
  const { result } = await renderHook(() => useAiUsage());
  await waitFor(() => expect(result.current.failed).toBe(true));
  expect(report).toHaveBeenCalled();
  expect(result.current.usage).toBeUndefined();
});

test("a reply of the wrong shape is treated as a failure, not trusted", async () => {
  const report = jest.spyOn(reporter, "report").mockImplementation(() => undefined);
  rpc.mockResolvedValue({ data: [{ used: "three" }], error: null });
  const { result } = await renderHook(() => useAiUsage());
  await waitFor(() => expect(result.current.failed).toBe(true));
  expect(report).toHaveBeenCalled();
});
