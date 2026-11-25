import { fireEvent, render, screen } from "@testing-library/react-native";
import { RECT_WALL } from "@buildit/core";
import { t } from "@/i18n";
import { useRooms } from "@/rooms/store";
import { useSettings } from "@/settings/store";
import { Dimensions } from "./dimensions";

const [mockReplace, mockBack] = [jest.fn(), jest.fn()];
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, back: mockBack }) }));
beforeEach(() => {
  useRooms.setState({ rooms: [] });
  useSettings.setState({ walkwayCm: 90 });
});

const field = (key: Parameters<typeof t>[0]) => screen.getByLabelText(t(key));
const fill = async (key: Parameters<typeof t>[0], text: string) => fireEvent.changeText(field(key), text);
const create = async () => fireEvent.press(screen.getByRole("button", { name: t("dimCreate") }));

test("asks for the name, the three sizes and where the door and window are", async () => {
  await render(<Dimensions />);
  expect(screen.getByText(t("way3t"))).toBeTruthy();
  expect(screen.getByText(t("dimHint"))).toBeTruthy();
  for (const key of ["dimName", "dimWidth", "dimLength", "dimHeight"] as const) expect(field(key)).toBeTruthy();
  expect(screen.getAllByRole("button", { name: t("wallS") })).toHaveLength(2); // door row and window row
});

test("a valid room is saved on the device and opens straight in the editor, furnishing it as the chosen kind", async () => {
  await render(<Dimensions />);
  await fill("dimName", "Guest room");
  await fill("dimWidth", "4,5");
  await fill("dimLength", "3");
  await create();
  const [room] = useRooms.getState().rooms;
  expect(room).toMatchObject({ name: "Guest room", dirty: true });
  expect(room.scene.room.openings).toEqual([expect.objectContaining({ type: "door", wall: RECT_WALL.south })]);
  expect(mockReplace).toHaveBeenCalledWith(`/editor/${room.id}?furnish=bedroom`); // a typed room needs no review
});

test("the room's kind and name keep in step until the person sets one", async () => {
  await render(<Dimensions />);
  expect((screen.getByRole("button", { name: t("kindBedroom") }).props as { accessibilityState: { selected: boolean } }).accessibilityState.selected).toBe(true); // "Bedroom" by default
  await fireEvent.press(screen.getByRole("button", { name: t("kindLiving") }));
  expect(field("dimName").props.value).toBe(t("kindLiving")); // an untouched name follows the kind
  await fill("dimName", "Home office");
  await fill("dimWidth", "3");
  await fill("dimLength", "3");
  await create();
  // the kind was picked by hand, so typing "office" in the name did not override it
  expect(mockReplace).toHaveBeenLastCalledWith(`/editor/${useRooms.getState().rooms[0].id}?furnish=living`);
});

test("typing a name picks the kind it suggests, and 'Empty for now' opens an empty room", async () => {
  await render(<Dimensions />);
  await fill("dimName", "مجلس الرجال");
  expect((screen.getByRole("button", { name: t("kindMajlis") }).props as { accessibilityState: { selected: boolean } }).accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: t("kindEmpty") }));
  await fill("dimWidth", "6");
  await fill("dimLength", "4");
  await create();
  expect(mockReplace).toHaveBeenLastCalledWith(`/editor/${useRooms.getState().rooms[0].id}`);
});

test("the chosen walls end up in the room", async () => {
  await render(<Dimensions />);
  await fill("dimWidth", "4");
  await fill("dimLength", "3");
  await fireEvent.press(screen.getAllByRole("button", { name: t("wallE") })[0]); // door row
  await fireEvent.press(screen.getAllByRole("button", { name: t("wallN") })[1]); // window row
  await create();
  const { openings } = useRooms.getState().rooms[0].scene.room;
  expect(openings.find((o) => o.type === "door")?.wall).toBe(RECT_WALL.east);
  expect(openings.find((o) => o.type === "window")?.wall).toBe(RECT_WALL.north);
});

test("mistakes are explained under the field and nothing is saved", async () => {
  await render(<Dimensions />);
  await fill("dimName", "  ");
  await fill("dimWidth", "40");
  await fill("dimLength", "3");
  await fill("dimHeight", "9");
  await create();
  expect(screen.getByText(t("dimNameRequired"))).toBeTruthy();
  expect(screen.getByText(t("dimRangeSize", 1.5, 12))).toBeTruthy();
  expect(screen.getByText(t("dimRangeHeight", 2, 4))).toBeTruthy();
  expect(useRooms.getState().rooms).toEqual([]);
  expect(mockReplace).not.toHaveBeenCalled();
});

test("a door and window that cannot share a wall say so", async () => {
  await render(<Dimensions />);
  await fill("dimWidth", "2");
  await fill("dimLength", "3");
  await fireEvent.press(screen.getAllByRole("button", { name: t("wallS") })[1]); // window on the south wall, like the door
  await create();
  expect(screen.getByText(t("dimOpenings"))).toBeTruthy();
});

test("back leaves the screen", async () => {
  await render(<Dimensions />);
  await fireEvent.press(screen.getByRole("button", { name: t("back") }));
  expect(mockBack).toHaveBeenCalled();
});

test("a new room starts with the walkway preference from Settings", async () => {
  useSettings.setState({ walkwayCm: 75 });
  await render(<Dimensions />);
  await fill("dimWidth", "4");
  await fill("dimLength", "3");
  await create();
  expect(useRooms.getState().rooms[0].scene.constraints.minWalkway).toBe(0.75);
});
