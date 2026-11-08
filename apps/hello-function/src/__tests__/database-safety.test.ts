import { afterEach, describe, expect, it } from "vitest";
import {
  assertIntegrationDatabase,
  configureIntegrationDatabaseName,
  setIntegrationContext,
} from "../config/database.guard.js";

afterEach(() => {
  Reflect.deleteProperty(globalThis, Symbol.for("cloud-backend-lab.integration-context"));
});

describe("integration database safety", () => {
  it.each([
    { mode: "local", config: { DATABASE_NAME: "cloud_backend_lab_test", DATABASE_HOST: "localhost", DATABASE_PORT: 5432 } },
    { mode: "local", config: { DATABASE_NAME: "cloud_backend_lab_test", DATABASE_HOST: "127.0.0.1", DATABASE_PORT: 5432 } },
    { mode: "ci", config: { DATABASE_NAME: "cloud_backend_test", DATABASE_HOST: "127.0.0.1", DATABASE_PORT: 5432 } },
  ] as const)("accepts the authorized $mode destination", ({ mode, config }) => {
    setIntegrationContext(mode);
    expect(() => assertIntegrationDatabase(config)).not.toThrow();
  });

  it.each([
    { DATABASE_NAME: "cloud_backend_lab", DATABASE_HOST: "localhost", DATABASE_PORT: 5432 },
    { DATABASE_NAME: "", DATABASE_HOST: "localhost", DATABASE_PORT: 5432 },
    { DATABASE_NAME: undefined, DATABASE_HOST: "localhost", DATABASE_PORT: 5432 },
    { DATABASE_NAME: "cloud_backend_lab_test", DATABASE_HOST: "db.remote", DATABASE_PORT: 5432 },
    { DATABASE_NAME: "cloud_backend_lab_test", DATABASE_HOST: "localhost", DATABASE_PORT: 5433 },
  ])("rejects an unauthorized local destination", (config) => {
    setIntegrationContext("local");
    expect(() => assertIntegrationDatabase(config as never)).toThrow(
      "Integration database destination is not authorized"
    );
  });

  it.each([
    { DATABASE_NAME: "cloud_backend_test", DATABASE_HOST: "localhost", DATABASE_PORT: 5432 },
    { DATABASE_NAME: "cloud_backend_test", DATABASE_HOST: "127.0.0.1", DATABASE_PORT: 5433 },
    { DATABASE_NAME: "cloud_backend_lab_test", DATABASE_HOST: "127.0.0.1", DATABASE_PORT: 5432 },
  ])("rejects an unauthorized CI destination", (config) => {
    setIntegrationContext("ci");
    expect(() => assertIntegrationDatabase(config)).toThrow(
      "Integration database destination is not authorized"
    );
  });

  it("selects CI only from the GitHub Actions runner signal and fixes its database name", () => {
    expect(configureIntegrationDatabaseName({ GITHUB_ACTIONS: "true" } as NodeJS.ProcessEnv)).toBe("ci");
    expect(process.env.DATABASE_NAME).toBe("cloud_backend_test");
    expect(Reflect.get(globalThis, Symbol.for("cloud-backend-lab.integration-context"))).toBe("ci");
  });
});
