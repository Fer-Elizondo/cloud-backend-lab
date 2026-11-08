import type { DatabaseConfig } from "./environment.js";

export type IntegrationEnvironment = "local" | "ci";

export const INTEGRATION_CONTEXT = Symbol.for(
  "cloud-backend-lab.integration-context"
);

const targets = {
  local: {
    database: "cloud_backend_lab_test",
    hosts: ["localhost", "127.0.0.1", "::1"],
    port: 5432,
  },
  ci: {
    database: "cloud_backend_test",
    hosts: ["127.0.0.1"],
    port: 5432,
  },
} as const;

export function integrationEnvironmentFrom(source: NodeJS.ProcessEnv): IntegrationEnvironment {
  return source.GITHUB_ACTIONS === "true" ? "ci" : "local";
}

export function setIntegrationContext(environment: IntegrationEnvironment): void {
  Reflect.set(globalThis, INTEGRATION_CONTEXT, environment);
}

export function configureIntegrationDatabaseName(
  source: NodeJS.ProcessEnv
): IntegrationEnvironment {
  const environment = integrationEnvironmentFrom(source);
  process.env.DATABASE_NAME = targets[environment].database;
  setIntegrationContext(environment);
  return environment;
}

export function assertIntegrationDatabase(
  config: Pick<DatabaseConfig, "DATABASE_NAME" | "DATABASE_HOST" | "DATABASE_PORT">
): void {
  const environment = Reflect.get(globalThis, INTEGRATION_CONTEXT) as
    | IntegrationEnvironment
    | undefined;

  // Only Vitest's integration config sets this marker. Normal application
  // startup remains unrestricted by the integration allowlist.
  if (environment === undefined) {
    if (process.env.CLOUD_BACKEND_INTEGRATION_RUN === "true") {
      throw new Error("Integration setup did not activate the database guard");
    }
    return;
  }

  const target = targets[environment];
  const allowedHosts: readonly string[] = target.hosts;
  if (
    config.DATABASE_NAME !== target.database ||
    !allowedHosts.includes(config.DATABASE_HOST.toLowerCase()) ||
    config.DATABASE_PORT !== target.port
  ) {
    throw new Error(`Integration database destination is not authorized for ${environment}`);
  }
}
