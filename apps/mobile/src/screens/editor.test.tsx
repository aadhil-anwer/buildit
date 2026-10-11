import { fireEvent, render, screen } from "@testing-library/react-native";
import { sampleBedroom } from "@buildit/core";
import { t } from "@/i18n";
import { useRooms } from "@/rooms/store";
import { Editor } from "./editor";

const mockBack = jest.fn();
let mockId = "r1";
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }), useLocalSearchParams: () => ({ id: mockId }) }));
beforeEach(() => {
  mockId = "r1";
  useRooms.setState({ rooms: [{ id: "r1", name: "Bedroom", scene: sampleBedroom(), updatedAt: Date.now(), dirty: false }] });
});

test("shows the room's name and plan", async () => {
  await render(<Editor />);
  expect(screen.getByText("Bedroom")).toBeTruthy();
});

test("a room that is gone says so and offers the way back", async () => {
  mockId = "missing";
  await render(<Editor />);
  expect(screen.getByText(t("roomGone"))).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("back") }));
  expect(mockBack).toHaveBeenCalled();
});
