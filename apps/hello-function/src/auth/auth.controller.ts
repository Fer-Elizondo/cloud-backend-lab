import type { Request, Response, NextFunction } from "express";
import { loginSchema } from "../schemas/auth.schema.js";
import { validateUser, generateToken } from "./auth.service.js";

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Datos de login inválidos",
        errors: result.error.issues,
      });

      return;
    }

    const { email, password } = result.data;

    const user = await validateUser(email, password);

    if (!user) {
      res.status(401).json({
        message: "Credenciales inválidas",
      });

      return;
    }

    const token = generateToken(user.id);

    res.status(200).json({
      token,
    });
  } catch (error) {
    next(error);
  }
}