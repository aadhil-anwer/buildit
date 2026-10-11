import { render, screen } from "@testing-library/react-native";
import { useEffect } from "react";
import { Boundary } from "@/test/boundary";
import { useFail } from "./use-fail";

function Probe({ value }: { value: unknown }) {
  const fail = useFail();
  useEffect(() => fail(value), [fail, value]);
  return null;
}

test.each([
  ["an Error", new Error("boom"), "boom"],
  ["a thrown non-Error, so the value is not lost", "plain", "plain"],
])("%s reaches the error boundary", async (_name, value, message) => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  await render(<Boundary><Probe value={value} /></Boundary>);
  expect(screen.getByText(`caught: ${message}`)).toBeTruthy();
});
