import { pool } from "../config/database.js";

export async function findUserByEmail(email: string) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        password_hash
      FROM users
      WHERE email = $1;
    `,
    [email]
  );

  return result.rows[0];
}