import { fireEvent, render, screen } from "@testing-library/react-native";
import { design, sampleBedroom } from "@buildit/core";
import { useEditor } from "@/editor/store";
import { t } from "@/i18n";
import { useRooms } from "@/rooms/store";
import { Versions } from "./versions";

const mockBack = jest.fn();
let mockId = "r1";
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }), useLocalSearchParams: () => ({ id: mockId }) }));
const press = async (name: string) => await fireEvent.press(await screen.findByRole("button", { name }));

beforeEach(() => {
  mockId = "r1";
  useEditor.setState({ roomId: null, history: null });
  useRooms.setState({ rooms: [{ id: "r1", name: "Bedroom", scene: sampleBedroom(), updatedAt: Date.now(), dirty: false }] });
});

test("with nothing saved it shows the room as it is and says how to save a version", async () => {
  await render(<Versions />);
  expect(screen.getByText(t("verCurrent"))).toBeTruthy();
  expect(screen.getByText(t("current"))).toBeTruthy();
  expect(screen.getByText(t("verNone"))).toBeTruthy();
});

test("saving keeps a version, newest first, and says so", async () => {
  await render(<Versions />);
  await press(t("saveVer"));
  expect(useRooms.getState().rooms[0].versions).toHaveLength(1);
  expect(await screen.findByText(t("tKept"))).toBeTruthy();
  expect(screen.getByText(t("verSaveLabel"))).toBeTruthy();
  expect(screen.queryByText(t("verNone"))).toBeNull();
});

test("restoring puts that version's scene back as one undoable step, and goes back to the editor", async () => {
  const old = sampleBedroom();
  const now = { ...old, room: { ...old.room, wallColor: design.materials.wall.ink } };
  useRooms.setState({ rooms: [{ id: "r1", name: "Bedroom", scene: now, updatedAt: Date.now(), dirty: false, versions: [{ id: "v1", label: "Before the dark walls", scene: old, createdAt: Date.now() - 3_600_000 }] }] });
  await render(<Versions />);
  expect(screen.getByText("Before the dark walls")).toBeTruthy();
  await press(t("restore"));
  expect(useRooms.getState().rooms[0].scene.room.wallColor).toBe(old.room.wallColor);
  expect(useEditor.getState().history?.past).toHaveLength(1); // so Undo brings the dark walls back
  expect(mockBack).toHaveBeenCalled();
});

test("a room that is gone says so", async () => {
  mockId = "missing";
  await render(<Versions />);
  expect(screen.getByText(t("roomGone"))).toBeTruthy();
});
