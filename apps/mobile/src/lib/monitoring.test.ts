import * as Sentry from "@sentry/react-native";
import { initMonitoring } from "./monitoring";
import { report, setSink } from "./report";

jest.mock("@sentry/react-native", () => ({ init: jest.fn(), captureException: jest.fn() }));
afterEach(() => setSink(undefined));

test("does nothing without a DSN", () => {
  initMonitoring(undefined);
  expect(Sentry.init).not.toHaveBeenCalled();
});

test("starts Sentry and forwards every report to it", () => {
  const dsn = "https://key@o1.ingest.sentry.io/2";
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  initMonitoring(dsn);
  expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn }));
  const err = new Error("boom");
  report(err, { screen: "editor" });
  expect(Sentry.captureException).toHaveBeenCalledWith(err, { extra: { screen: "editor" } });
});
