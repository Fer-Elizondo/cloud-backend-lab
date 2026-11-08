import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { afterAll } from "vitest";
import { configureIntegrationDatabaseName } from "../config/database.guard.js";

dotenv.config({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
});

// Dotenv does not override inherited values. The dedicated integration policy
// selects the fixed database and records the environment before app imports.
configureIntegrationDatabaseName(process.env);

process.env.JWT_SECRET =
  "test-only-secret-not-for-production";

// Import only after the destination policy is active. Pool.end() then runs
// after each integration test file has finished using the shared pool.
const { pool } = await import("../config/database.js");
afterAll(async () => {
  await pool.end();
});
