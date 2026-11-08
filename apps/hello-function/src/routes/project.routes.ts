import { Router } from "express";
import { getProjects, getProject, createProject, deleteProject, updateProject } from "../controllers/project.controller.js";
import { authMiddleware } from "../auth/auth.middleware.js";

const router = Router();

router.get("/projects", authMiddleware, getProjects);
router.get("/projects/:id", authMiddleware, getProject);

router.post("/projects", authMiddleware, createProject);
router.put("/projects/:id", authMiddleware, updateProject);
router.delete("/projects/:id", authMiddleware, deleteProject);

export default router;
