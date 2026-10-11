export interface CaptureSupport {
  lidar: boolean;
  guided: boolean;
}

/** Which scanners this phone and this build can run. The native scanners arrive in Phase 6; until then only typing dimensions works. */
export const captureSupport = (): CaptureSupport => ({ lidar: false, guided: false });
