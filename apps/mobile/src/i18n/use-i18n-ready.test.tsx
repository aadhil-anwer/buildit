import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as i18n from ".";
import { useI18nReady } from "./use-i18n-ready";

test("becomes ready once the language is set up", async () => {
  let finish = () => undefined as void;
  jest.spyOn(i18n, "initI18n").mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
  const { result } = await renderHook(() => useI18nReady());
  expect(result.current).toBe(false);
  await act(async () => {
    finish();
    await Promise.resolve();
  });
  expect(result.current).toBe(true);
});

test("a failing setup surfaces as an error instead of a blank screen", async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(i18n, "initI18n").mockRejectedValue(new Error("storage down"));
  await expect(renderHook(() => useI18nReady()).then(() => waitFor(() => undefined))).rejects.toThrow("storage down");
});
