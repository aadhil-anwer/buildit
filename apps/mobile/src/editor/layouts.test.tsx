import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { emptyRoom, furnishRoom, makeOpening, RECT_WALL, samePoses, TRADITIONS, type Scene } from "@buildit/core";
import { t } from "@/i18n";
import { useRooms } from "@/rooms/store";
import { LayoutCard } from "./layout-card";
import { useLayouts } from "./layouts-store";
import { LayoutsPane } from "./panes/layouts-pane";
import { useEditor } from "./store";
import { ruleLine, traditionName } from "./tradition-copy";

// These compute five real layouts (4-9 s a room here); the 5 s default flakes on a busy machine or CI runner.
jest.setTimeout(30_000);
jest.mock("@/lib/haptics", () => ({ haptic: { land: jest.fn(), pick: jest.fn(), win: jest.fn() } }));

const room = (kind: "bedroom" | "living") => furnishRoom(emptyRoom({ name: "R", width: 4, length: 3.6, height: 2.8, openings: [makeOpening("door", RECT_WALL.west, 0.3, 0.9), makeOpening("window", RECT_WALL.north, 1.3, 1.4)] }), kind).scene;
const bedroom = () => room("bedroom");
/** A living room with every piece 3 cm off where the app put it, so each idea has to move something. */
const nudged = () => { const s = room("living"); return { ...s, objects: s.objects.map((o) => ({ ...o, x: o.x + 0.03 })) }; };
const open = (scene: Scene) => {
  useRooms.setState({ rooms: [{ id: "r", name: "R", scene, updatedAt: 0, dirty: false }] });
  useEditor.getState().open("r", scene);
};
const present = () => useEditor.getState().history!.present;

beforeEach(() => {
  jest.useFakeTimers();
  useLayouts.setState({ phase: { name: "idle" }, layouts: [], same: [], active: -1, qibla: {} });
});
afterEach(() => jest.useRealTimers());

async function arranged(scene: Scene) {
  open(scene);
  const run = useLayouts.getState().open();
  await jest.runAllTimersAsync();
  await run;
  return useLayouts.getState();
}

test("every idea is either a card or a line saying which layout it matches, never the same layout twice", async () => {
  const { layouts, same } = await arranged(nudged());
  expect([...layouts.map((a) => a.tradition), ...same.map((x) => x.tradition)].sort()).toEqual([...TRADITIONS].sort());
  for (const [i, a] of layouts.entries()) {
    expect(a.moved.length).toBeGreaterThan(0);
    for (const b of layouts.slice(i + 1)) expect(samePoses(a.scene, b.scene)).toBe(false);
  }
  expect(layouts.map((a) => a.tradition)).toEqual(["practical", "arabian"]);
  expect(same).toContainEqual(expect.objectContaining({ tradition: "vastu", as: "practical" }));
});

test("an idea that would change nothing is said in a line, not shown as a card", async () => {
  const { layouts, same } = await arranged(room("living")); // the app's own furnishing is already the practical plan
  expect(same).toContainEqual({ tradition: "practical", as: null, follows: true });
  expect(layouts.map((a) => a.tradition)).not.toContain("practical");
});

test("looking at a layout previews it, using it keeps it as one undoable step", async () => {
  const { layouts } = await arranged(nudged());
  await act(() => useLayouts.getState().look(1));
  expect(useEditor.getState().preview).toBe(layouts[1].scene);
  const before = present();
  await act(() => useLayouts.getState().use(1));
  expect(useEditor.getState().preview).toBeNull();
  expect(present()).toBe(layouts[1].scene);
  await act(() => useEditor.getState().undo());
  expect(present()).toBe(before);
});

test("closing and opening again mid-run (the pane remounting) gives each idea once, not twice", async () => {
  open(nudged());
  const first = useLayouts.getState().open();
  await jest.advanceTimersByTimeAsync(50);
  useLayouts.getState().close();
  const second = useLayouts.getState().open();
  await jest.runAllTimersAsync();
  await Promise.all([first, second]);
  const { layouts, same } = useLayouts.getState();
  const ids = [...layouts.map((a) => a.tradition), ...same.map((x) => x.tradition)];
  expect(ids.sort()).toEqual([...TRADITIONS].sort());
  expect(same.filter((x) => x.as === x.tradition)).toEqual([]);
});

test("closing the layouts puts the room back as it is", async () => {
  await arranged(nudged());
  await act(() => useLayouts.getState().look(0));
  await act(() => useLayouts.getState().close());
  expect(useEditor.getState().preview).toBeNull();
  expect(useLayouts.getState().layouts).toEqual([]);
});

test("the pane shows the cards, says which ideas matched, compares side by side, and says the traditions are unreviewed", async () => {
  open(nudged());
  await render(<LayoutsPane />);
  await act(() => jest.runAllTimersAsync());
  expect(screen.getAllByText(traditionName("arabian")).length).toBeGreaterThan(0);
  expect(screen.getByText(t("layoutsFollows", traditionName("vastu"), traditionName("practical")))).toBeTruthy(); // the practical plan already passes every Vastu rule here
  expect(screen.getByText(t("layoutsNote"))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("layoutsCompare") }));
  expect(screen.getByText(t("layoutsCurrent"))).toBeTruthy();
});

test("using a layout from the pane hands the room back, so the pane is never left empty", async () => {
  const onUsed = jest.fn();
  open(nudged());
  await render(<LayoutsPane onUsed={onUsed} />);
  await act(() => jest.runAllTimersAsync());
  const before = present();
  await fireEvent.press(screen.getAllByRole("button", { name: t("layoutsUse") })[0]);
  expect(onUsed).toHaveBeenCalled();
  expect(present()).not.toBe(before);
});

test("a card lists its tradition's rules with what was measured, and the Gulf card asks which wall faces Mecca", async () => {
  const onQibla = jest.fn();
  await render(<LayoutCard scene={bedroom()} tradition="arabian" ctx={{}} active={false} onLook={jest.fn()} onQibla={onQibla} />);
  expect(screen.getByText(t("qiblaQ"))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("wallW") }));
  expect(onQibla).toHaveBeenCalledWith("west");
});

test("rule sentences carry the measured fact in words or digits", () => {
  expect(ruleLine({ id: "vBedHead", status: "fail", facts: { head: "west" } })).toBe(t("vBedHead", t("dWest")));
  expect(ruleLine({ id: "mOpenFloor", status: "pass", facts: { pct: 72 } })).toBe(t("mOpenFloor", "72"));
  expect(ruleLine({ id: "aPrivacy", status: "pass", facts: {} })).toBe(t("aPrivacy"));
});
