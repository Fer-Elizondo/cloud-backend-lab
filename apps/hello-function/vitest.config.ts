
import { configDefaults, defineConfig } from "vitest/config";

// Mark this Vitest process so database.ts fails closed if the authorized
// setup file is removed, skipped, or fails before activating its context.
process.env.CLOUD_BACKEND_INTEGRATION_RUN = "true";

export default defineConfig({
  test: {
    include: [
      "src/__tests__/auth.test.ts",
      "src/__tests__/project.test.ts",
    ],
    setupFiles: ["./src/__tests__/setup.ts"],
    exclude: [...configDefaults.exclude, "**/dist/**"],
  },
});
