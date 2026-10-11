import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { getWalls, sampleBedroom } from "@buildit/core";
import { formatFixed, formatNumber, t } from "@/i18n";
import { typeName } from "@/rooms/names";
import { useRooms } from "@/rooms/store";
import { Review } from ".";

const [mockReplace, mockBack] = [jest.fn(), jest.fn()];
let mockId = "r1";
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, back: mockBack }), useLocalSearchParams: () => ({ id: mockId }) }));
const wallButton = (name: string, length: number) => screen.getByRole("button", { name: `${name}. ${t("wallLen")} ${formatFixed(length, 2)} ${t("m")}` });
const room = () => useRooms.getState().rooms[0];

beforeEach(() => {
  mockId = "r1";
  useRooms.setState({ rooms: [{ id: "r1", name: "Bedroom", scene: sampleBedroom(), updatedAt: 1, dirty: false }] });
});

test("shows the heading, the hint and every piece with its size in centimetres", async () => {
  await render(<Review />);
  expect(screen.getByText(t("revH"))).toBeTruthy();
  expect(screen.getByText(t("revSub"))).toBeTruthy();
  expect(screen.getByText(t("furn"))).toBeTruthy();
  const bed = sampleBedroom().objects.find((o) => o.type === "bed")!;
  expect(screen.getAllByText(typeName("bed"))).toHaveLength(1);
  expect(screen.getByText(`${formatNumber(Math.round(bed.w * 100))} × ${formatNumber(Math.round(bed.d * 100))} ${t("cm")}`)).toBeTruthy();
});

test("a room with no furniture says so and what happens next", async () => {
  useRooms.setState({ rooms: [{ ...room(), scene: { ...sampleBedroom(), objects: [] } }] });
  await render(<Review />);
  expect(screen.getByText(t("revNoFurn"))).toBeTruthy();
});

test("each wall's length is a button; tapping opens the stepper, which changes it by 5 cm and saves the room", async () => {
  await render(<Review />);
  const north = getWalls(sampleBedroom().room)[0];
  await fireEvent.press(wallButton(t("wallN"), north.length));
  const sheet = screen.getByTestId("wall-sheet");
  expect(within(sheet).getByText(`${formatFixed(north.length, 2)} ${t("m")}`)).toBeTruthy();
  await fireEvent.press(within(sheet).getByRole("button", { name: t("longer") }));
  expect(within(sheet).getByText(`${formatFixed(north.length + 0.05, 2)} ${t("m")}`)).toBeTruthy();
  expect(getWalls(room().scene.room)[0].length).toBeCloseTo(north.length + 0.05);
  expect(room().dirty).toBe(true);
  await fireEvent.press(within(sheet).getByRole("button", { name: t("shorter") }));
  await fireEvent.press(within(sheet).getByRole("button", { name: t("shorter") }));
  expect(getWalls(room().scene.room)[0].length).toBeCloseTo(north.length - 0.05);
});

test("a step that would leave a door or window off its wall is not offered", async () => {
  const scene = sampleBedroom();
  scene.room.openings = scene.room.openings.map((o) => (o.type === "window" ? { ...o, offset: 0.2, width: 1.8 } : o));
  useRooms.setState({ rooms: [{ ...room(), scene }] });
  await render(<Review />);
  const west = getWalls(scene.room)[3]; // the window is on the west wall; a south or north step changes it
  await fireEvent.press(wallButton(t("wallW"), west.length));
  const sheet = screen.getByTestId("wall-sheet");
  for (let i = 0; i < 30; i++) {
    const shorter = within(sheet).getByRole("button", { name: t("shorter") });
    if ((shorter.props as { accessibilityState?: { disabled?: boolean } }).accessibilityState?.disabled) break;
    await fireEvent.press(shorter);
  }
  expect(getWalls(room().scene.room)[3].length).toBeGreaterThanOrEqual(2.0 - 1e-6); // window ends at 0.2 + 1.8
});

test("Done closes the stepper", async () => {
  await render(<Review />);
  await fireEvent.press(wallButton(t("wallN"), getWalls(sampleBedroom().room)[0].length));
  await fireEvent.press(within(screen.getByTestId("wall-sheet")).getByRole("button", { name: t("done") }));
  expect(screen.queryByTestId("wall-sheet")).toBeNull();
});

test("'Looks right' opens the room, and back leaves", async () => {
  await render(<Review />);
  await fireEvent.press(screen.getByRole("button", { name: t("looksRight") }));
  expect(mockReplace).toHaveBeenCalledWith("/editor/r1");
  await fireEvent.press(screen.getByRole("button", { name: t("back") }));
  expect(mockBack).toHaveBeenCalled();
});

test("a room that is gone says so and offers the way back", async () => {
  mockId = "missing";
  await render(<Review />);
  expect(screen.getByText(t("roomGone"))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("back") }));
  expect(mockBack).toHaveBeenCalled();
});
