import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authConfig } from "./auth.config.js";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      res.status(401).json({
        message: "Token de autenticación requerido",
      });

      return;
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      res.status(401).json({
        message: "Formato de token inválido",
      });

      return;
    }

    const payload = jwt.verify(
      token,
      authConfig.jwtSecret
    );

    req.user = {
      id: payload.sub as string,
    };

    next();
  } catch (error) {
    res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
}