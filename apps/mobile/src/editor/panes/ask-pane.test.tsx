import { fireEvent, render, screen } from "@testing-library/react-native";
import { sampleBedroom } from "@buildit/core";
import { useAsk, type Phase } from "@/ai/ask-store";
import { askDesigner } from "@/ai/client";
import { t } from "@/i18n";
import { useEditor } from "../store";
import { AskPane } from "./ask-pane";

const mockPush = jest.fn();
let mockSession: { user: { email?: string } } | null = { user: { email: "noor@example.com" } };
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/auth/session", () => ({ useSession: () => mockSession }));
jest.mock("@/settings/use-ai-usage", () => ({ useAiUsage: () => ({ usage: { used: 3, limit: 20, resetsAt: new Date() }, failed: false }) }));
jest.mock("@/ai/client", () => ({ askDesigner: jest.fn() }));
jest.mock("@/lib/report", () => ({ report: jest.fn() }));
const ask = jest.mocked(askDesigner);
const phase = (p: { phase: Phase }) => useAsk.setState(p);

beforeEach(() => {
  mockSession = { user: { email: "noor@example.com" } };
  ask.mockReset();
  useEditor.getState().open("r", sampleBedroom());
  useAsk.setState({ phase: { name: "idle" }, requests: 0, turns: [] });
});

test("idle: a request box, how many requests are left, and the four quick asks", async () => {
  await render(<AskPane onFix={jest.fn()} />);
  expect(screen.getByLabelText(t("askPh"))).toBeTruthy();
  expect(screen.getByText(t("left", 17, 20))).toBeTruthy();
  for (const key of ["chip1", "chip2", "chip3", "chip4"] as const) expect(screen.getByRole("button", { name: t(key) })).toBeTruthy();
});

test("typing a request and sending it asks the designer, and an empty box cannot be sent", async () => {
  ask.mockResolvedValue({ ok: false, code: "offline" });
  await render(<AskPane onFix={jest.fn()} />);
  expect((screen.getByRole("button", { name: t("aiSend") }).props as { accessibilityState: { disabled: boolean } }).accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(screen.getByLabelText(t("askPh")), "  make it cosier  ");
  await fireEvent.press(screen.getByRole("button", { name: t("aiSend") }));
  expect(ask.mock.calls[0][0].message).toBe("make it cosier");
  expect(await screen.findByText(t("aiErrOfflineH"))).toBeTruthy();
});

test("a quick ask sends its own words", async () => {
  ask.mockResolvedValue({ ok: false, code: "offline" });
  await render(<AskPane onFix={jest.fn()} />);
  await fireEvent.press(screen.getByRole("button", { name: t("chip4") }));
  expect(ask.mock.calls[0][0].message).toBe(t("chip4"));
});

test("running: shows the question and what has been done so far", async () => {
  phase({ phase: { name: "running", question: "more space", lines: ["Moving the Bed 15 cm east"] } });
  await render(<AskPane onFix={jest.fn()} />);
  expect(screen.getByText(t("working"))).toBeTruthy();
  expect(screen.getByText("“more space”")).toBeTruthy();
  expect(screen.getByText("Moving the Bed 15 cm east")).toBeTruthy();
});

test("done: what changed, the measured before and after, and Keep, Undo and another option", async () => {
  phase({ phase: { name: "done", question: "q", verdict: "changed", lines: ["Moving the Bed 15 cm east"], rows: [{ key: "score", label: t("facScore"), before: "75", after: "91" }], reply: "Done.", changedIds: ["bed_1"] } });
  await render(<AskPane onFix={jest.fn()} />);
  for (const text of [t("aiDone"), "Done.", t("changed"), t("measured"), t("facScore"), "75", "91"]) expect(screen.getByText(text)).toBeTruthy();
  for (const name of [t("keep"), t("undoB"), t("another")]) expect(screen.getByRole("button", { name })).toBeTruthy();
});

test.each([["unchanged", "aiNothing", "aiNothingP"], ["reverted", "aiReverted", "aiRevertedP"]] as const)("done but %s: says so, says why, and only offers to close", async (verdict, title, body) => {
  phase({ phase: { name: "done", question: "q", verdict, lines: [], rows: [], reply: null, changedIds: [] } });
  await render(<AskPane onFix={jest.fn()} />);
  expect(screen.getByText(t(title))).toBeTruthy();
  expect(screen.getByText(t(body))).toBeTruthy();
  expect(screen.queryByRole("button", { name: t("keep") })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: t("aiGotIt") }));
  expect(useAsk.getState().phase.name).toBe("idle");
});

test("limit: says when it resets and what still works, and the quick asks are off", async () => {
  phase({ phase: { name: "limit", resetsAt: new Date(Date.now() + 125 * 60_000) } });
  await render(<AskPane onFix={jest.fn()} />);
  expect(screen.getByText(t("limitH"))).toBeTruthy();
  expect(screen.getByText(t("limitP", 2, 5))).toBeTruthy();
  expect((screen.getByRole("button", { name: t("chip1") }).props as { accessibilityState: { disabled: boolean } }).accessibilityState.disabled).toBe(true);
  expect(screen.queryByLabelText(t("askPh"))).toBeNull();
});

test("a guest is told an email is needed and can add one", async () => {
  mockSession = { user: {} };
  await render(<AskPane onFix={jest.fn()} />);
  expect(screen.getByText(t("aiGuestH"))).toBeTruthy();
  expect(screen.queryByLabelText(t("askPh"))).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: t("upgradeGuest") }));
  expect(mockPush).toHaveBeenCalledWith("/upgrade");
});

test.each([["offline", "aiErrOfflineH"], ["model_failed", "aiErrDownH"], ["too_long", "aiErrLongH"], ["refused", "aiErrRefusedH"]] as const)("error %s: says what happened, that nothing changed, and Try again resends (except a refusal)", async (kind, title) => {
  ask.mockResolvedValue({ ok: false, code: "offline" });
  phase({ phase: { name: "error", kind, question: "again please" } });
  await render(<AskPane onFix={jest.fn()} />);
  expect(screen.getByText(t(title))).toBeTruthy();
  const retry = screen.queryByRole("button", { name: t("aiRetry") });
  expect(!!retry).toBe(kind !== "refused");
  if (retry) {
    await fireEvent.press(retry);
    expect(ask.mock.calls[0][0].message).toBe("again please");
  }
});
