import { report, setSink } from "./report";

afterEach(() => setSink(undefined));

test("sends the error and its context to the sink", () => {
  const sink = jest.fn();
  setSink(sink);
  const err = new Error("boom");
  report(err, { screen: "editor" });
  expect(sink).toHaveBeenCalledWith(err, { screen: "editor" });
});

test("wraps a thrown non-Error so the value is not lost", () => {
  const sink = jest.fn<void, [Error]>();
  setSink(sink);
  report("plain string");
  expect(sink.mock.calls[0][0]).toEqual(new Error("plain string"));
});

test("falls back to console.error when there is no sink", () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => undefined);
  report(new Error("boom"));
  expect(log).toHaveBeenCalled();
  log.mockRestore();
});

test("a failing sink never hides the original error or throws", () => {
  setSink(() => {
    throw new Error("sink down");
  });
  const log = jest.spyOn(console, "error").mockImplementation(() => undefined);
  expect(() => report(new Error("boom"))).not.toThrow();
  expect(log).toHaveBeenCalledTimes(2);
  log.mockRestore();
});
