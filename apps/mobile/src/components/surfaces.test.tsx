import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { color } from "@/theme";
import { Hairline } from "./hairline";
import { Plate } from "./plate";

const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style as object) as Record<string, unknown>;

test("hairline is 1px in the divider colour", async () => {
  await render(<Hairline testID="h" />);
  expect(flat("h")).toMatchObject({ height: 1, backgroundColor: color.divider });
});

test("plate is a 6px surface mat inside a 1px divider outline, with the archival grade", async () => {
  await render(<Plate testID="p"><Hairline testID="img" /></Plate>);
  expect(flat("p")).toMatchObject({ borderWidth: 1, borderColor: color.divider });
  const mat = screen.getByTestId("p").children[0] as unknown as { props: { style: object } };
  expect(StyleSheet.flatten(mat.props.style)).toMatchObject({ borderWidth: 6, borderColor: color.surface });
});

test("plate mat width can follow the card variant (5px)", async () => {
  await render(<Plate testID="p" mat={5}><Hairline /></Plate>);
  const mat = screen.getByTestId("p").children[0] as unknown as { props: { style: object } };
  expect(StyleSheet.flatten(mat.props.style)).toMatchObject({ borderWidth: 5 });
});
