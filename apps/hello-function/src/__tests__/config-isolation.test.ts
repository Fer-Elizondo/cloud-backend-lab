import { afterEach, describe, expect, it, vi } from "vitest";

const relevantVariables = [
  "JWT_SECRET",
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "DATABASE_POOL_MAX",
  "PORT",
] as const;

async function withEnvironment(
  values: Partial<Record<(typeof relevantVariables)[number], string>>,
  run: () => Promise<void>
) {
  const previous = Object.fromEntries(
    relevantVariables.map((name) => [name, process.env[name]])
  ) as Record<(typeof relevantVariables)[number], string | undefined>;

  for (const name of relevantVariables) {
    delete process.env[name];
  }
  Object.assign(process.env, values);
  vi.resetModules();

  try {
    await run();
  } finally {
    for (const name of relevantVariables) {
      delete process.env[name];
      const value = previous[name];
      if (value !== undefined) process.env[name] = value;
    }
    vi.resetModules();
  }
}

describe("configuration module isolation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("imports JWT configuration without PostgreSQL variables", async () => {
    await withEnvironment({ JWT_SECRET: "isolated-auth-secret" }, async () => {
      const { authConfig } = await import("../auth/auth.config.js");
      expect(authConfig.jwtSecret).toBe("isolated-auth-secret");
    });
  });

  it("imports PostgreSQL configuration without JWT_SECRET", async () => {
    await withEnvironment({
      DATABASE_HOST: "localhost",
      DATABASE_PORT: "5432",
      DATABASE_NAME: "cloud_backend_lab_test",
      DATABASE_USER: "test_user",
      DATABASE_PASSWORD: "test-password",
    }, async () => {
      const { pool } = await import("../config/database.js");
      await pool.end();
    });
  });

  it("validates the complete application configuration at its entry point", async () => {
    await withEnvironment({ JWT_SECRET: "isolated-auth-secret" }, async () => {
      await expect(import("../index.js")).rejects.toThrow("DATABASE_HOST: required");
    });
  });
});
