import { pool } from "../config/database.js";

export async function findAllProjects(userId: string) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        status
      FROM projects
      WHERE user_id = $1
      ORDER BY created_at;
    `,
    [userId]
  );

  return result.rows;
}

export async function findProjectById(
  id: string,
  userId: string
) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        description,
        status
      FROM projects
      WHERE id = $1
        AND user_id = $2;
    `,
    [id, userId]
  );

  return result.rows[0];
}

export async function createProject(
  userId: string,
  name: string,
  description: string
) {
  const result = await pool.query(
    `
      INSERT INTO projects (user_id, name, description, status)
      VALUES ($1, $2, $3, 'PLANNED')
      RETURNING id, name, description, status;
    `,
    [userId, name, description]
  );

  return result.rows[0];
}
export async function updateProject(
  id: string,
  userId: string,
  name: string,
  description: string,
  status: string
) {
  const result = await pool.query(
    `
      UPDATE projects
      SET
        name = $1,
        description = $2,
        status = $3,
        updated_at = NOW()
      WHERE id = $4
        AND user_id = $5
      RETURNING
        id,
        name,
        description,
        status;
    `,
    [name, description, status, id, userId]
  );

  return result.rows[0];
}

export async function deleteProject(id: string, userId: string) {
  const result = await pool.query(
    `
      DELETE FROM projects
      WHERE id = $1
        AND user_id = $2
      RETURNING
        id,
        name,
        description,
        status;
    `,
    [id, userId]
  );

  return result.rows[0];
}
