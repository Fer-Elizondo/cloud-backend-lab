import { Router } from "express";
import { login } from "./auth.controller.js";
import { authMiddleware } from "./auth.middleware.js";

const router = Router();

router.post("/login", login);

router.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({
    message: "Autenticación correcta",
    userId: req.user?.id,
  });
});

export default router;