import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { design, sampleBedroom } from "@buildit/core";
import { t } from "@/i18n";
import { useEditor } from "@/editor/store";
import { useRooms } from "@/rooms/store";
import { Editor } from "./editor";

jest.mock("@/editor/scene3d/room-canvas", () => ({ RoomCanvas: () => null })); // WebGL needs a real renderer
const mockBack = jest.fn();
const mockPush = jest.fn();
let mockId = "r1";
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack, push: mockPush }), useLocalSearchParams: () => ({ id: mockId }) }));
const scene = () => useRooms.getState().rooms[0].scene;
const press = async (name: string) => await fireEvent.press(await screen.findByRole("button", { name }));
const tab = async (key: Parameters<typeof t>[0]) => await fireEvent.press(await screen.findByRole("tab", { name: t(key) }));

beforeEach(() => {
  mockId = "r1";
  useEditor.setState({ roomId: null, history: null, selectedId: null, view: "3d", tab: "tAsk" });
  useRooms.setState({ rooms: [{ id: "r1", name: "Bedroom", scene: sampleBedroom(), updatedAt: 0, dirty: false }] });
});

test("shows the room's name, the room check chip and the design's four tabs", async () => {
  await render(<Editor />);
  expect(await screen.findByText("Bedroom")).toBeTruthy();
  expect(screen.getByRole("button", { name: new RegExp(`^${t("check")}\\.`) })).toBeTruthy();
  for (const key of ["tAsk", "tAdd", "tItem", "tFin"] as const) expect(screen.getByRole("tab", { name: t(key) })).toBeTruthy();
});

test("adding a piece puts it in the room, saves it, and undo takes it back", async () => {
  await render(<Editor />);
  const before = scene().objects.length;
  await tab("tAdd");
  await press(`${t("addH")}: ${t("iDesk")}`);
  expect(scene().objects).toHaveLength(before + 1);
  expect(useRooms.getState().rooms[0].dirty).toBe(true);
  await press(t("undoB"));
  expect(scene().objects).toHaveLength(before);
  await press(t("redoB"));
  expect(scene().objects).toHaveLength(before + 1);
});

test("with nothing selected the Item tab says how to select; a selected piece can be turned, locked and deleted", async () => {
  await render(<Editor />);
  await tab("tItem");
  expect(screen.getByText(t("itemEmpty"))).toBeTruthy();
  const wardrobe = scene().objects.find((o) => o.type === "wardrobe")!;
  await act(() => useEditor.getState().select(wardrobe.id));
  await press(t("lock"));
  expect(screen.getByText(t("lockedNote"))).toBeTruthy();
  await press(t("unlock"));
  await press(t("delete"));
  expect(scene().objects.some((o) => o.id === wardrobe.id)).toBe(false);
  expect(screen.getByText(t("itemEmpty"))).toBeTruthy();
});

test("a wall and a floor finish can be chosen", async () => {
  await render(<Editor />);
  await tab("tFin");
  await press(t("cClay"));
  await press(t("fWalnut"));
  expect(scene().room.wallColor).toBe(design.materials.wall.clay);
  expect(scene().room.floorColor).toBe(design.materials.floor.walnut);
});

test("the room check chip opens the check with each rule in words", async () => {
  await render(<Editor />);
  await fireEvent.press(await screen.findByRole("button", { name: new RegExp(`^${t("check")}\\.`) }));
  expect(await screen.findByText(t("rDoorOk"))).toBeTruthy();
});

test("a restyle changes the room's colours", async () => {
  await render(<Editor />);
  await press(t("stJapan"));
  expect(scene().room.wallColor).toBe(design.styles.japan.wall);
});

test("the room can be switched between 3D and plan", async () => {
  await render(<Editor />);
  expect(useEditor.getState().view).toBe("3d");
  await press(t("vplan"));
  expect(useEditor.getState().view).toBe("plan");
  expect(screen.getByTestId("plan-canvas")).toBeTruthy();
  await press(t("v3d"));
  expect(useEditor.getState().view).toBe("3d");
});

test("the versions button opens this room's versions, and a change offers saving one", async () => {
  await render(<Editor />);
  await press(t("verH"));
  expect(mockPush).toHaveBeenCalledWith("/versions/r1");
  await press(t("stJapan"));
  await press(t("tAsk")).catch(() => undefined);
  await fireEvent.press(await screen.findByRole("button", { name: t("nx3") }));
  expect(useRooms.getState().rooms[0].versions).toHaveLength(1);
});

test("a room that is gone says so and offers the way back", async () => {
  mockId = "missing";
  await render(<Editor />);
  expect(screen.getByText(t("roomGone"))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("back") }));
  expect(mockBack).toHaveBeenCalled();
});
