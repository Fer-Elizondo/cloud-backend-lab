import type { PoolConfig } from "pg";
import type { DatabaseConfig } from "./environment.js";

export function createDatabasePoolOptions(config: DatabaseConfig): PoolConfig {
  return {
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    database: config.DATABASE_NAME,
    user: config.DATABASE_USER,
    password: config.DATABASE_PASSWORD,
    max: config.DATABASE_POOL_MAX,
  };
}
