import { fireEvent, render, screen, within } from "@testing-library/react-native";
import * as support from "@/capture/support";
import { t } from "@/i18n";
import { Capture } from "./capture";

const [mockPush, mockBack] = [jest.fn(), jest.fn()];
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));
const supports = (lidar: boolean, guided: boolean) => jest.spyOn(support, "captureSupport").mockReturnValue({ lidar, guided });
const method = (title: string) => screen.getByRole("button", { name: new RegExp(title) });

test("today only typing dimensions is offered: recommended, with an honest note about scanning", async () => {
  supports(false, false);
  await render(<Capture />);
  expect(screen.getByText(t("capH"))).toBeTruthy();
  expect(screen.getByText(t("capSubNoScan"))).toBeTruthy();
  expect(screen.queryByText(t("way1t"))).toBeNull();
  expect(screen.queryByText(t("way2t"))).toBeNull();
  expect(screen.getByText(t("rec"))).toBeTruthy();
  await fireEvent.press(method(t("way3t")));
  expect(mockPush).toHaveBeenCalledWith("/capture/dimensions");
});

test("with LiDAR it is the recommended card, the others stay available as rows", async () => {
  supports(true, true);
  await render(<Capture />);
  expect(screen.getByText(t("capSub"))).toBeTruthy();
  expect(screen.getAllByText(t("rec"))).toHaveLength(1);
  await fireEvent.press(method(t("way1t")));
  expect(mockPush).toHaveBeenLastCalledWith("/capture/lidar");
  await fireEvent.press(method(t("way2t")));
  expect(mockPush).toHaveBeenLastCalledWith("/capture/guided");
  await fireEvent.press(method(t("way3t")));
  expect(mockPush).toHaveBeenLastCalledWith("/capture/dimensions");
});

test("the recommended method is the first one this phone supports", async () => {
  supports(false, true);
  await render(<Capture />);
  expect(within(method(t("way2t"))).getByText(t("rec"))).toBeTruthy();
  expect(within(method(t("way3t"))).queryByText(t("rec"))).toBeNull();
});

test("back leaves the screen", async () => {
  supports(false, false);
  await render(<Capture />);
  await fireEvent.press(screen.getByRole("button", { name: t("back") }));
  expect(mockBack).toHaveBeenCalled();
});
