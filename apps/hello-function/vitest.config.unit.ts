import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/__tests__/runtime-config.test.ts",
      "src/__tests__/config-isolation.test.ts",
      "src/__tests__/shutdown.test.ts",
      "src/__tests__/error-handler.test.ts",
      "src/__tests__/database-safety.test.ts",
      "src/__tests__/integration-setup-order.test.ts",
      "src/__tests__/project-test-cleanup.test.ts",
      "src/__tests__/seeder-safety.test.mjs",
    ],
    setupFiles: [],
  },
});
