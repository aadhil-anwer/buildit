import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import { useCanvasActive } from "./use-canvas-active";

let mockFocused = true;
jest.mock("expo-router", () => ({ useIsFocused: () => mockFocused }));

test("active only while the screen is in front and the app is in the foreground", async () => {
  let notify: (state: string) => void = () => undefined;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, cb) => {
    notify = cb as (state: string) => void;
    return { remove: jest.fn() };
  });
  Object.defineProperty(AppState, "currentState", { value: "active", configurable: true });
  mockFocused = true;
  const { result, rerender } = await renderHook(() => useCanvasActive());
  expect(result.current).toBe(true);
  await act(() => notify("background"));
  expect(result.current).toBe(false);
  await act(() => notify("active"));
  expect(result.current).toBe(true);
  mockFocused = false;
  await rerender({});
  expect(result.current).toBe(false);
});
