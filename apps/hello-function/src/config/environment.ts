import { z } from "zod";

const integerString = z.string().regex(/^\d+$/).transform(Number);

const authEnvironmentSchema = z.object({
  JWT_SECRET: z.string().refine((value) => value.trim().length > 0),
});

const databaseEnvironmentSchema = z.object({
  DATABASE_HOST: z.string().trim().min(1),
  DATABASE_PORT: integerString.pipe(z.number().int().min(1).max(65535)),
  DATABASE_NAME: z.string().trim().min(1),
  DATABASE_USER: z.string().trim().min(1),
  DATABASE_PASSWORD: z.string().refine((value) => value.trim().length > 0),
  DATABASE_POOL_MAX: z.preprocess(
    (value) => value === undefined ? "5" : value,
    integerString.pipe(z.number().int().min(1).max(20))
  ),
});

const serverEnvironmentSchema = z.object({
  PORT: z.preprocess(
    (value) => value === undefined ? "8080" : value,
    integerString.pipe(z.number().int().min(1).max(65535))
  ),
  // Development/test default. Set explicitly to fit the deployment shutdown budget.
  SHUTDOWN_TIMEOUT_MS: z.preprocess(
    (value) => value === undefined ? "5000" : value,
    integerString.pipe(z.number().int().min(1).max(120000))
  ),
});

const runtimeEnvironmentSchema = authEnvironmentSchema
  .extend(databaseEnvironmentSchema.shape)
  .extend(serverEnvironmentSchema.shape);

export type AuthConfig = z.infer<typeof authEnvironmentSchema>;
export type DatabaseConfig = z.infer<typeof databaseEnvironmentSchema>;
export type ServerConfig = z.infer<typeof serverEnvironmentSchema>;
export type RuntimeConfig = z.infer<typeof runtimeEnvironmentSchema>;

const variableNames = [
  "JWT_SECRET",
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "DATABASE_POOL_MAX",
  "PORT",
  "SHUTDOWN_TIMEOUT_MS",
] as const;

type VariableName = (typeof variableNames)[number];

function issueForVariable(name: VariableName, value: unknown): string {
  if (value === undefined || value === null) {
    return `${name}: required`;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return `${name}: empty`;
  }

  if (name === "DATABASE_PORT" || name === "PORT") {
    return `${name}: must be an integer from 1 to 65535`;
  }

  if (name === "DATABASE_POOL_MAX") {
    return `${name}: must be an integer from 1 to 20`;
  }

  if (name === "SHUTDOWN_TIMEOUT_MS") {
    return `${name}: must be an integer from 1 to 120000`;
  }

  return `${name}: invalid`;
}

function parseConfig<T extends z.ZodType>(
  schema: T,
  source: NodeJS.ProcessEnv,
  variables: readonly VariableName[]
): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const invalidNames = new Set(
      result.error.issues
        .map((issue) => issue.path[0])
        .filter((name): name is VariableName =>
          variables.includes(name as VariableName)
        )
    );

    const details = [...invalidNames].map((name) =>
      issueForVariable(name, source[name])
    );

    throw new Error(`Invalid environment configuration: ${details.join("; ")}`);
  }

  return result.data;
}

export function parseAuthConfig(
  source: NodeJS.ProcessEnv = process.env
): AuthConfig {
  return parseConfig(authEnvironmentSchema, source, ["JWT_SECRET"]);
}

export function parseDatabaseConfig(
  source: NodeJS.ProcessEnv = process.env
): DatabaseConfig {
  return parseConfig(databaseEnvironmentSchema, source, [
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_NAME",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
    "DATABASE_POOL_MAX",
  ]);
}

export function parseServerConfig(
  source: NodeJS.ProcessEnv = process.env
): ServerConfig {
  return parseConfig(serverEnvironmentSchema, source, ["PORT", "SHUTDOWN_TIMEOUT_MS"]);
}

export function parseRuntimeConfig(
  source: NodeJS.ProcessEnv = process.env
): RuntimeConfig {
  return parseConfig(runtimeEnvironmentSchema, source, variableNames);
}
