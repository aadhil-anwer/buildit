import { roomCheck, sampleBedroom } from "@buildit/core";

test("the app can use the engine", () => expect(roomCheck(sampleBedroom()).score).toBe(75));
