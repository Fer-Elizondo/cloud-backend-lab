import { afterEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { seedTestUsers } from "../../../../database/seed-test-users.mjs";

vi.mock("pg", () => ({
  Pool: vi.fn(function PoolMock() {
    return { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() };
  }),
}));
vi.mock("bcrypt", () => ({ default: { hash: vi.fn().mockResolvedValue("test-hash") } }));

afterEach(() => vi.mocked(Pool).mockClear());

const local = {
  DATABASE_HOST: "localhost",
  DATABASE_PORT: "5432",
  DATABASE_NAME: "cloud_backend_lab_test",
  DATABASE_USER: "unit-test-user",
  DATABASE_PASSWORD: "unit-test-password",
};
const ci = {
  GITHUB_ACTIONS: "true",
  DATABASE_HOST: "127.0.0.1",
  DATABASE_PORT: "5432",
  DATABASE_NAME: "cloud_backend_test",
  DATABASE_USER: "unit-test-user",
  DATABASE_PASSWORD: "unit-test-password",
};

describe("test user seeder safety", () => {
  it.each([
    { ...local, DATABASE_NAME: "cloud_backend_lab" },
    { ...local, DATABASE_NAME: "" },
    { ...local, DATABASE_NAME: undefined },
    { ...local, DATABASE_HOST: "db.remote" },
    { ...local, DATABASE_PORT: "5433" },
    { ...ci, DATABASE_NAME: "cloud_backend_lab_test" },
    { ...ci, DATABASE_HOST: "localhost" },
    { ...ci, DATABASE_PORT: "5433" },
  ])("rejects unauthorized seed targets before constructing Pool", async (source) => {
    await expect(seedTestUsers({ source, hashPassword: vi.fn() })).rejects.toThrow(
      "Test user seeder destination is not authorized"
    );
    expect(Pool).not.toHaveBeenCalled();
  });

  it.each([
    { source: local, expectedDatabase: "cloud_backend_lab_test" },
    { source: ci, expectedDatabase: "cloud_backend_test" },
  ])("constructs a pool only for the authorized $expectedDatabase destination", async ({ source, expectedDatabase }) => {
    await seedTestUsers({ source, hashPassword: vi.fn().mockResolvedValue("test-hash") });
    expect(Pool).toHaveBeenCalledOnce();
    expect(vi.mocked(Pool).mock.calls[0]?.[0]).toMatchObject({
      database: expectedDatabase,
      port: 5432,
    });
  });
});
