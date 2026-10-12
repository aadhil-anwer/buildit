import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { design, sampleBedroom } from "@buildit/core";
import { t } from "@/i18n";
import { useRooms } from "@/rooms/store";
import { useEditor } from "./store";
import { SuggestionCard } from "./suggestion-card";

const scene = () => ({ ...sampleBedroom(), room: { ...sampleBedroom().room, wallColor: design.materials.wall.sage }, objects: sampleBedroom().objects.filter((o) => o.type !== "rug") });
const wait = async (ms: number) => await act(() => void jest.advanceTimersByTime(ms));

beforeEach(() => {
  jest.useFakeTimers();
  useRooms.setState({ rooms: [{ id: "r", name: "R", scene: scene(), updatedAt: 0, dirty: false }] });
  useEditor.getState().open("r", scene());
});
afterEach(() => jest.useRealTimers());

test("a suggestion appears after the room has been left alone a moment, not before", async () => {
  await render(<SuggestionCard top={100} />);
  expect(screen.queryByText(t("sugH"))).toBeNull();
  await wait(2700);
  expect(screen.getByText(t("sugH"))).toBeTruthy();
});

test("it stays away while a piece is selected or the check is open", async () => {
  useEditor.getState().select(sampleBedroom().objects[0].id);
  await render(<SuggestionCard top={100} />);
  await wait(10_000);
  expect(screen.queryByText(t("sugH"))).toBeNull();
});

test("Try it applies the change as one undoable step and retires the suggestion", async () => {
  await render(<SuggestionCard top={100} />);
  await wait(2700);
  const before = useEditor.getState().history!.present.objects.length;
  await fireEvent.press(screen.getByRole("button", { name: t("tryIt") }));
  expect(useEditor.getState().history!.past).toHaveLength(1);
  expect(useEditor.getState().history!.present.objects).toHaveLength(before + 1); // the floor lamp beside the desk
  expect(useEditor.getState().dismissed).toEqual(["lamp"]);
});

test("dismissing changes nothing in the room, and the next suggestion comes later", async () => {
  await render(<SuggestionCard top={100} />);
  await wait(2700);
  const first = screen.getByText(t("sugH"));
  expect(first).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("dismiss") }));
  expect(useEditor.getState().history!.past).toHaveLength(0);
  expect(screen.queryByText(t("sugH"))).toBeNull();
  await wait(3000);
  expect(screen.queryByText(t("sugH"))).toBeNull(); // the gap after a dismissal is longer
  await wait(3500);
  expect(screen.getByText(t("sugH"))).toBeTruthy();
});
