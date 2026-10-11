import { captureSupport } from "./support";

test("until the native scanners ship, only typing dimensions is offered", () => expect(captureSupport()).toEqual({ lidar: false, guided: false }));
