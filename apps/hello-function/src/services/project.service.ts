import {
  findAllProjects,
  findProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "../repositories/project.repository.js";

import { AppError } from "../errors/app-error.js";

export async function getAllProjects(userId: string) {
  const projects = await findAllProjects(userId);

  const activeProjects = projects.filter(
    (project) => project.status !== "CANCELLED"
  );

  return activeProjects;
}

export function getProjectById(
  id: string,
  userId: string
) {
  return findProjectById(id, userId);
}

export function createProjectService(
  userId: string,
  name: string,
  description: string
) {
  return createProject(userId, name, description);
}

export async function updateProjectService(
  id: string,
  userId: string,
  name: string,
  description: string,
  status: string
) {

  return updateProject(id, userId, name, description, status);
}

export async function deleteProjectService(id: string, userId: string) {
  return deleteProject(id, userId);
}
