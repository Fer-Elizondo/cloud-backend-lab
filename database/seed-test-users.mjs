import bcrypt from "bcrypt";
import { Pool } from "pg";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const targets = {
  local: { database: "cloud_backend_lab_test", hosts: ["localhost", "127.0.0.1", "::1"], port: 5432 },
  ci: { database: "cloud_backend_test", hosts: ["127.0.0.1"], port: 5432 },
};

export function createSeederDatabaseConfig(source = process.env) {
  const environment = source.GITHUB_ACTIONS === "true" ? "ci" : "local";
  const target = targets[environment];
  const databaseConfig = {
    host: source.DATABASE_HOST,
    port: Number(source.DATABASE_PORT),
    database: source.DATABASE_NAME,
    user: source.DATABASE_USER,
    password: source.DATABASE_PASSWORD,
  };

  if (
    databaseConfig.database !== target.database ||
    !target.hosts.includes(databaseConfig.host?.toLowerCase()) ||
    databaseConfig.port !== target.port
  ) {
    throw new Error(`Test user seeder destination is not authorized for ${environment}`);
  }

  for (const [name, value] of Object.entries(databaseConfig)) {
    if (value === undefined || value === "" || (name === "port" && !Number.isInteger(value))) {
      throw new Error(`Missing or invalid database configuration: ${name}`);
    }
  }

  return databaseConfig;
}

export async function seedTestUsers({
  source = process.env,
  PoolClass = Pool,
  hashPassword = bcrypt.hash,
} = {}) {
  const databaseConfig = createSeederDatabaseConfig(source);
  const passwordHash = await hashPassword("Password123!", 10);
  const pool = new PoolClass(databaseConfig);

  try {
    await pool.query(
      `
        INSERT INTO users (id, name, email, password_hash)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE
        SET id = EXCLUDED.id,
            name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash;
      `,
      ["e45a44bb-128a-4e58-bb68-05bb4f838ee4", "Usuario de prueba", "fernando@example.com", passwordHash]
    );

    await pool.query(
      `
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash;
      `,
      ["Segundo usuario de prueba", "usuario.prueba@example.com", passwordHash]
    );
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await seedTestUsers();
}
