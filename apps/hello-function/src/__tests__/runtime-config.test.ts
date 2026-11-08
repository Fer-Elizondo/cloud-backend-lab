import { describe, expect, it } from "vitest";
import { createDatabasePoolOptions } from "../config/database.options.js";
import {
  parseAuthConfig,
  parseDatabaseConfig,
  parseRuntimeConfig,
} from "../config/environment.js";

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    JWT_SECRET: "test-jwt-secret",
    DATABASE_HOST: "localhost",
    DATABASE_PORT: "5432",
    DATABASE_NAME: "test_database",
    DATABASE_USER: "test_user",
    DATABASE_PASSWORD: "test-password",
    DATABASE_POOL_MAX: "7",
    PORT: "8080",
  };
}

describe("runtime environment configuration", () => {
  it("keeps authentication configuration independent from database variables", () => {
    const config = parseAuthConfig({ JWT_SECRET: "isolated-auth-secret" });

    expect(config.JWT_SECRET).toBe("isolated-auth-secret");
  });

  it("keeps database configuration independent from JWT_SECRET", () => {
    const config = parseDatabaseConfig({
      DATABASE_HOST: "localhost",
      DATABASE_PORT: "5432",
      DATABASE_NAME: "test_database",
      DATABASE_USER: "test_user",
      DATABASE_PASSWORD: "test-password",
    });

    expect(config.DATABASE_POOL_MAX).toBe(5);
  });

  it.each([
    "JWT_SECRET",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_NAME",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
  ])("reports missing required variable %s", (name) => {
    const environment = validEnvironment();
    delete environment[name];

    let message = "";
    try {
      parseRuntimeConfig(environment);
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }

    expect(message).toContain(`${name}: required`);
  });

  it.each([
    "JWT_SECRET",
    "DATABASE_HOST",
    "DATABASE_NAME",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
  ])("reports empty required variable %s", (name) => {
    const environment = validEnvironment();
    environment[name] = "   ";

    let message = "";
    try {
      parseRuntimeConfig(environment);
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }

    expect(message).toContain(`${name}: empty`);
  });

  it("reports missing and empty required variables by name only", () => {
    const missing = validEnvironment();
    delete missing.JWT_SECRET;
    missing.DATABASE_PASSWORD = "";

    let message = "";
    try {
      parseRuntimeConfig(missing);
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }

    expect(message).toContain("JWT_SECRET: required");
    expect(message).toContain("DATABASE_PASSWORD: empty");
    expect(message).not.toContain("test-jwt-secret");
    expect(message).not.toContain("test-password");
  });

  it("rejects an invalid database port without echoing its value", () => {
    const environment = validEnvironment();
    environment.DATABASE_PORT = "port-value-must-not-appear";

    let message = "";
    try {
      parseRuntimeConfig(environment);
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }

    expect(message).toContain("DATABASE_PORT: must be an integer from 1 to 65535");
    expect(message).not.toContain("port-value-must-not-appear");
  });

  it.each(["0", "1.5", "21", "not-an-integer"])(
    "rejects invalid DATABASE_POOL_MAX value %s",
    (poolMax) => {
      const environment = validEnvironment();
      environment.DATABASE_POOL_MAX = poolMax;

      let message = "";
      try {
        parseRuntimeConfig(environment);
      } catch (error) {
        message = error instanceof Error ? error.message : "";
      }

      expect(message).toContain("DATABASE_POOL_MAX: must be an integer from 1 to 20");
      if (poolMax === "not-an-integer") {
        expect(message).not.toContain(poolMax);
      }
    }
  );

  it("defaults the pool maximum and maps socket hosts into pg options", () => {
    const environment = validEnvironment();
    delete environment.DATABASE_POOL_MAX;
    environment.DATABASE_HOST = "/cloudsql/project:us-central1:instance";

    const config = parseRuntimeConfig(environment);
    const poolOptions = createDatabasePoolOptions(config);

    expect(config.DATABASE_POOL_MAX).toBe(5);
    expect(poolOptions.host).toBe("/cloudsql/project:us-central1:instance");
    expect(poolOptions.port).toBe(5432);
    expect(poolOptions.max).toBe(5);
  });

  it("uses a development shutdown timeout default and rejects invalid values safely", () => {
    const environment = validEnvironment();
    expect(parseRuntimeConfig(environment).SHUTDOWN_TIMEOUT_MS).toBe(5000);

    environment.SHUTDOWN_TIMEOUT_MS = "secret-like-invalid-value";
    let message = "";
    try {
      parseRuntimeConfig(environment);
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }

    expect(message).toContain("SHUTDOWN_TIMEOUT_MS: must be an integer from 1 to 120000");
    expect(message).not.toContain("secret-like-invalid-value");
  });

  it("maps every database setting into the pg.Pool options", () => {
    const config = parseDatabaseConfig({
      DATABASE_HOST: "db.test.invalid",
      DATABASE_PORT: "5544",
      DATABASE_NAME: "fixture_database",
      DATABASE_USER: "fixture_user",
      DATABASE_PASSWORD: "fixture-password",
      DATABASE_POOL_MAX: "9",
    });

    expect(createDatabasePoolOptions(config)).toEqual({
      host: "db.test.invalid",
      port: 5544,
      database: "fixture_database",
      user: "fixture_user",
      password: "fixture-password",
      max: 9,
    });
  });
});
