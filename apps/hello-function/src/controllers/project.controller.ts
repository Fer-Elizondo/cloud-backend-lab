import type { NextFunction, Request, Response } from "express";
import { createProjectService, deleteProjectService, getAllProjects, getProjectById, updateProjectService } from "../services/project.service.js";
import { createProjectSchema, projectIdSchema, updateProjectSchema } from "../schemas/project.schema.js";
import { projectIdParamSchema } from "../schemas/params.schema.js";

export async function getProjects(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        message: "Usuario no autenticado",
      });
      return;
    }

    const projects = await getAllProjects(userId);

    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
}

export async function getProject(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {

    const result = projectIdParamSchema.safeParse(req.params);

    if (!result.success) {
      res.status(400).json({
        message: "El ID del proyecto debe ser un UUID válido",
      });

      return;
    }

    const { id } = result.data;

    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        message: "Usuario no autenticado",
      });
      return;
    }

    const project = await getProjectById(id, userId);

    if (!project) {
      res.status(404).json({
        message: "Proyecto no encontrado",
      });
      return;
    }
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}


export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = createProjectSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Datos de proyecto inválidos",
        errors: result.error.issues,
      });

      return;
    }

    const { name, description } = result.data;

    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        message: "Usuario no autenticado",
      });
      return;
    }

    const project = await createProjectService(
      userId,
      name,
      description ?? ""
    );

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const idResult = projectIdParamSchema.safeParse(req.params);

    if (!idResult.success) {
      res.status(400).json({
        message: "El ID del proyecto debe ser un UUID válido",
      });

      return;
    }

    const { id } = idResult.data;

    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        message: "Usuario no autenticado",
      });
      return;
    }

    const result = updateProjectSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Datos de proyecto inválidos",
        errors: result.error.issues,
      });
      return;
    }

    const { name, description, status } = result.data;

    const project = await updateProjectService(
      id,
      userId,
      name,
      description,
      status
    );

    if (!project) {
      res.status(404).json({
        message: "Proyecto no encontrado",
      });

      return;
    }

    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {

    const result = projectIdParamSchema.safeParse(req.params);

    if (!result.success) {
      res.status(400).json({
        message: "El ID del proyecto debe ser un UUID válido",
      });

      return;
    }

    const { id } = result.data;

    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        message: "Usuario no autenticado",
      });
      return;
    }


    const project = await deleteProjectService(id, userId);

    if (!project) {
      res.status(404).json({
        message: "Proyecto no encontrado",
      });

      return;
    }

    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}
