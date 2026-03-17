import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/integration/**/*.test.ts"],
    setupFiles: ["src/tests/integration/harness.ts"],
    fileParallelism: false,
    isolate: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
