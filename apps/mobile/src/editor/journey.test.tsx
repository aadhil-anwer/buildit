import { act, fireEvent, render, renderHook, screen } from "@testing-library/react-native";
import { emptyRoom, makeOpening, RECT_WALL, sampleBedroom, type Scene } from "@buildit/core";
import { useToast } from "@/components/toast";
import { t } from "@/i18n";
import { typeName } from "@/rooms/names";
import { useRooms } from "@/rooms/store";
import { EssentialsRow } from "./essentials-row";
import { FurnishCard } from "./furnish-card";
import { runSliced, useFurnish } from "./furnish-store";
import { RoomCheckChip } from "./room-check-chip";
import { ScoreDelta } from "./score-delta";
import { useEditor } from "./store";
import { missingCount, useRoomComplete } from "./use-room-complete";

jest.mock("@/lib/haptics", () => ({ haptic: { land: jest.fn(), pick: jest.fn(), win: jest.fn() } }));
const { haptic } = jest.requireMock<{ haptic: Record<string, jest.Mock> }>("@/lib/haptics");

const empty = () => emptyRoom({ name: "Room", width: 4, length: 3.6, height: 2.8, openings: [makeOpening("door", RECT_WALL.south, 0.4, 0.9), makeOpening("window", RECT_WALL.north, 1, 1.4)] });
const open = (scene: Scene) => {
  useRooms.setState({ rooms: [{ id: "r", name: "R", scene, updatedAt: 0, dirty: false }] });
  useEditor.getState().open("r", scene);
};
const present = () => useEditor.getState().history!.present;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  useFurnish.setState({ phase: { name: "idle" }, quiet: false });
  useToast.setState({ message: null });
});
afterEach(() => jest.useRealTimers());

test("runSliced runs an engine generator to its end and sees every step", async () => {
  function* count() {
    yield 1;
    yield 2;
    return "done";
  }
  const seen: number[] = [];
  const run = runSliced(count(), (v) => seen.push(v));
  await jest.runAllTimersAsync();
  await expect(run).resolves.toBe("done");
  expect(seen).toEqual([1, 2]);
});

test("furnishing an empty bedroom shows each piece arriving, then keeps the whole set as one undoable step", async () => {
  open(empty());
  const said: (string | null)[] = [];
  const unsub = useToast.subscribe((s) => said.push(s.message));
  const run = useFurnish.getState().furnish("bedroom");
  await jest.runAllTimersAsync();
  await run;
  expect(present().objects.map((o) => o.type)).toEqual(expect.arrayContaining(["bed", "nightstand", "wardrobe", "rug", "floor_lamp"]));
  expect(useEditor.getState().preview).toBeNull();
  expect(useFurnish.getState().phase.name).toBe("idle");
  expect(haptic.land).toHaveBeenCalledTimes(present().objects.length); // one tap of feedback per piece that lands
  expect(said).toContain(t("furnishDone"));
  unsub();
  await act(() => useEditor.getState().undo());
  expect(present().objects).toHaveLength(0);
});

test("the furnish card is there for an empty room, offers the four kinds and a way to add your own, and goes once there is furniture", async () => {
  open(empty());
  const onOwn = jest.fn();
  await render(<FurnishCard bottom={0} onOwn={onOwn} />);
  for (const k of ["kindBedroom", "kindLiving", "kindMajlis", "kindOffice"] as const) expect(screen.getByRole("button", { name: t(k) })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("furnishOwn") }));
  expect(onOwn).toHaveBeenCalled();
  await act(() => open(sampleBedroom()));
  expect(screen.queryByText(t("furnishH"))).toBeNull();
});

test("the essentials checklist counts what is in and adds a missing piece where it belongs in one tap", async () => {
  open(sampleBedroom());
  await render(<EssentialsRow />);
  expect(screen.getByText(t("essentialsCount", "4", "5"))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("essentialAdd", typeName("floor_lamp")) }));
  await act(() => jest.runAllTimersAsync());
  expect(present().objects.some((o) => o.type === "floor_lamp")).toBe(true);
  expect(missingCount(present())).toBe(0);
});

test("a rising score shows +N and a success tap; a preview's score change shows nothing", async () => {
  const view = await render(<ScoreDelta score={80} live />);
  await view.rerender(<ScoreDelta score={86} live />);
  expect(screen.getByText("+6")).toBeTruthy();
  expect(haptic.win).toHaveBeenCalledTimes(1);
  await act(() => jest.advanceTimersByTime(1200));
  await view.rerender(<ScoreDelta score={70} live={false} />);
  expect(screen.queryByText(/[+−]/)).toBeNull();
});

test("'room complete' is said once, when the person's own change puts the last essential in, not when the room opens", async () => {
  const noLamp = { ...sampleBedroom(), objects: sampleBedroom().objects };
  open(noLamp);
  await renderHook(() => useRoomComplete());
  expect(useToast.getState().message).toBeNull(); // opening a room with one missing says nothing
  const lamp = { id: "floor_lamp_1", catalogId: "floor_lamp", type: "floor_lamp" as const, name: "Lamp", w: 0.4, d: 0.4, h: 1.6, x: 0.4, z: 3.2, rotation: 0, color: "#333" };
  await act(() => useEditor.getState().set({ ...present(), objects: [...present().objects, lamp] }));
  expect(useToast.getState().message).toBe(t("roomComplete"));
  expect(haptic.win).toHaveBeenCalledTimes(1);
});

test("an empty room's chip shows no score and says how to get one, instead of a free 100", async () => {
  await render(<RoomCheckChip score={100} rules={[]} empty onPress={jest.fn()} />);
  expect(screen.getByText(t("chipEmpty"))).toBeTruthy();
  expect(screen.queryByText("100")).toBeNull();
  expect(screen.queryByText(t("allOk"))).toBeNull();
});
