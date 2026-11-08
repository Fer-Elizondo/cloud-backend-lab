import { afterEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));
vi.mock("pg", () => ({ Pool: vi.fn(function PoolMock() { return { end: vi.fn() }; }) }));

const names = [
  "CLOUD_BACKEND_INTEGRATION_RUN",
  "GITHUB_ACTIONS",
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "JWT_SECRET",
] as const;
const previous = new Map(names.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of names) {
    const value = previous.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  Reflect.deleteProperty(globalThis, Symbol.for("cloud-backend-lab.integration-context"));
  vi.resetModules();
  vi.mocked(Pool).mockClear();
});

describe("integration setup import ordering", () => {
  it("activates the guard and fixes the target before the application imports its pool", async () => {
    process.env.CLOUD_BACKEND_INTEGRATION_RUN = "true";
    delete process.env.GITHUB_ACTIONS;
    process.env.DATABASE_HOST = "localhost";
    process.env.DATABASE_PORT = "5432";
    process.env.DATABASE_NAME = "cloud_backend_lab";
    process.env.DATABASE_USER = "unit-test-user";
    process.env.DATABASE_PASSWORD = "unit-test-password";

    await import("./setup.js");
    expect(Reflect.get(globalThis, Symbol.for("cloud-backend-lab.integration-context"))).toBe("local");
    expect(process.env.DATABASE_NAME).toBe("cloud_backend_lab_test");

    await import("../index.js");
    expect(Pool).toHaveBeenCalledOnce();
    expect(vi.mocked(Pool).mock.calls[0]?.[0]).toMatchObject({
      host: "localhost",
      port: 5432,
      database: "cloud_backend_lab_test",
    });
  });

  it("fails before constructing the pool if the integration setup context is missing", async () => {
    process.env.CLOUD_BACKEND_INTEGRATION_RUN = "true";
    delete process.env.GITHUB_ACTIONS;
    process.env.DATABASE_HOST = "localhost";
    process.env.DATABASE_PORT = "5432";
    process.env.DATABASE_NAME = "cloud_backend_lab_test";
    process.env.DATABASE_USER = "unit-test-user";
    process.env.DATABASE_PASSWORD = "unit-test-password";
    Reflect.deleteProperty(globalThis, Symbol.for("cloud-backend-lab.integration-context"));

    await expect(import("../config/database.js")).rejects.toThrow(
      "Integration setup did not activate the database guard"
    );
    expect(Pool).not.toHaveBeenCalled();
  });
});
