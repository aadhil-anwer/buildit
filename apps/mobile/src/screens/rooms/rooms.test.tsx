import { fireEvent, render, screen } from "@testing-library/react-native";
import { sampleBedroom, sampleLivingRoom } from "@buildit/core";
import { formatFixed, t } from "@/i18n";
import * as store from "@/rooms/store";
import { useSyncStatus } from "@/sync/use-sync";
import { Rooms } from ".";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
const seed = (...rooms: [string, ReturnType<typeof sampleBedroom>, number][]) =>
  store.useRooms.setState({ rooms: rooms.map(([name, scene, updatedAt], i) => ({ id: `r${i}`, name, scene, updatedAt, dirty: false })) });
beforeEach(() => {
  useSyncStatus.setState({ failed: false });
  seed();
  jest.spyOn(store, "useRoomsReady").mockReturnValue(true);
});

test("while rooms load it shows skeletons, not a spinner and not the empty state", async () => {
  jest.spyOn(store, "useRoomsReady").mockReturnValue(false);
  await render(<Rooms />);
  expect(screen.getAllByRole("progressbar", { name: t("loadingRooms") }).length).toBeGreaterThan(0);
  expect(screen.queryByText(t("emptyH"))).toBeNull();
});

test("with no rooms it explains the three ways in, and still offers to scan", async () => {
  await render(<Rooms />);
  expect(screen.getByText(t("emptyH"))).toBeTruthy();
  expect(screen.getByText(t("emptyP"))).toBeTruthy();
  for (const key of ["way1t", "way2t", "way3t", "way1d", "way2d", "way3d"] as const) expect(screen.getByText(t(key))).toBeTruthy();
  expect(screen.queryByText(t("nRooms", 0))).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: t("scan") }));
  expect(mockPush).toHaveBeenCalledWith("/capture");
});

test("lists rooms newest edit first with their size and when they were edited, and counts them", async () => {
  seed(["Study", sampleLivingRoom(), Date.now() - 3 * 86_400_000], ["Bedroom", sampleBedroom(), Date.now()]);
  await render(<Rooms />);
  const names = screen.getAllByTestId("room-name").map((n) => (n.props as { children: string }).children);
  expect(names).toEqual(["Bedroom", "Study"]);
  expect(screen.getByText(t("nRooms", 2))).toBeTruthy();
  expect(screen.getByText(`${t("e0")} · ${formatFixed(4, 1)} × ${formatFixed(3.6, 1)} ${t("m")}`)).toBeTruthy();
});

test("opening a room, the scan button and settings navigate", async () => {
  seed(["Bedroom", sampleBedroom(), Date.now()]);
  await render(<Rooms />);
  await fireEvent.press(screen.getByRole("button", { name: /Bedroom/ }));
  expect(mockPush).toHaveBeenCalledWith("/editor/r0");
  await fireEvent.press(screen.getByRole("button", { name: t("scan") }));
  expect(mockPush).toHaveBeenCalledWith("/capture");
  await fireEvent.press(screen.getByRole("button", { name: t("setH") }));
  expect(mockPush).toHaveBeenCalledWith("/settings");
});

test("says when rooms could not be synced, and that they are safe", async () => {
  useSyncStatus.setState({ failed: true });
  await render(<Rooms />);
  expect(screen.getByText(t("syncFailed"))).toBeTruthy();
});

test("says nothing about syncing when all is well", async () => {
  await render(<Rooms />);
  expect(screen.queryByText(t("syncFailed"))).toBeNull();
});

test("pressing and holding a room asks first, and only deleting removes it (and queues the server delete)", async () => {
  store.useRooms.setState({ rooms: [{ id: "a", remoteId: "srv-a", name: "Study", scene: sampleLivingRoom(), updatedAt: 2, dirty: false }, { id: "b", name: "Bedroom", scene: sampleBedroom(), updatedAt: 1, dirty: false }], deleted: [] });
  await render(<Rooms />);
  await fireEvent(screen.getByRole("button", { name: new RegExp(`^Study\\.`) }), "longPress");
  expect(screen.getByText(t("delRoomH"))).toBeTruthy();
  expect(screen.getByText(t("delRoomP", "Study"))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("cancel") }));
  expect(store.useRooms.getState().rooms).toHaveLength(2);
  await fireEvent(screen.getByRole("button", { name: new RegExp(`^Study\\.`) }), "longPress");
  await fireEvent.press(screen.getByRole("button", { name: t("delConf") }));
  expect(store.useRooms.getState().rooms.map((r) => r.name)).toEqual(["Bedroom"]);
  expect(store.useRooms.getState().deleted).toEqual(["srv-a"]);
});

test("a room can also be deleted with the screen reader's Delete action", async () => {
  seed(["Study", sampleLivingRoom(), 1]);
  await render(<Rooms />);
  await fireEvent(screen.getByRole("button", { name: new RegExp(`^Study\\.`) }), "accessibilityAction", { nativeEvent: { actionName: "delete" } });
  expect(screen.getByText(t("delRoomH"))).toBeTruthy();
});
