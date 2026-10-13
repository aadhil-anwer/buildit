import { useHints } from "./hints";

test("a hint is unseen until it is seen, and stays seen", () => {
  useHints.setState({ seen: {} });
  expect(useHints.getState().seen.editorMove).toBeUndefined();
  useHints.getState().see("editorMove");
  expect(useHints.getState().seen).toEqual({ editorMove: true });
});
