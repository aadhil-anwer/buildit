// Native modules that have no JS fallback in tests.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual<object>("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// The environment every test runs in (a local Supabase and a throwaway anon key).
process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54421";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "h.eyJyb2xlIjoiYW5vbiJ9.s";

jest.mock("react-native-safe-area-context", () => jest.requireActual<{ default: object }>("react-native-safe-area-context/jest/mock").default);

// Reanimated and gesture handler are native; these are their documented jest stand-ins.
jest.mock("react-native-worklets", () => jest.requireActual<object>("react-native-worklets/src/mock"));
jest.mock("react-native-reanimated", () => jest.requireActual<object>("react-native-reanimated/mock"));
jest.mock("react-native-gesture-handler", () => {
  jest.requireActual("react-native-gesture-handler/jestSetup");
  return jest.requireActual<object>("react-native-gesture-handler");
});
