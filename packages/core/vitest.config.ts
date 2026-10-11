import { defineConfig } from "vitest/config";

// Files run one at a time so the timing tests in perf.test.ts are not skewed by other workers.
export default defineConfig({ test: { include: ["tests/**/*.test.ts"], environment: "node", fileParallelism: false } });
