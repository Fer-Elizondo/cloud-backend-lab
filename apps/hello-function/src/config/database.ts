import { Pool } from "pg";
import { createDatabasePoolOptions } from "./database.options.js";
import { assertIntegrationDatabase } from "./database.guard.js";
import { parseDatabaseConfig } from "./environment.js";

const databaseConfig = parseDatabaseConfig();
assertIntegrationDatabase(databaseConfig);

export const pool = new Pool(createDatabasePoolOptions(databaseConfig));
