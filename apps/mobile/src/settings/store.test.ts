import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSettings } from "./store";

beforeEach(async () => {
  await AsyncStorage.clear();
  useSettings.setState({ walkwayCm: 90 });
});

test("the walkway preference starts at the standard 90 cm and can be set to 75", () => {
  expect(useSettings.getState().walkwayCm).toBe(90);
  useSettings.getState().setWalkway(75);
  expect(useSettings.getState().walkwayCm).toBe(75);
});

test("it survives a restart", async () => {
  useSettings.getState().setWalkway(75);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const saved = await AsyncStorage.getItem("settings");
  useSettings.setState({ walkwayCm: 90 });
  await AsyncStorage.setItem("settings", saved as string);
  await useSettings.persist.rehydrate();
  expect(useSettings.getState().walkwayCm).toBe(75);
});

test("a stored value that is not 75 or 90 is ignored", async () => {
  await AsyncStorage.setItem("settings", JSON.stringify({ state: { walkwayCm: 80 }, version: 1 }));
  await useSettings.persist.rehydrate();
  expect(useSettings.getState().walkwayCm).toBe(90);
});
