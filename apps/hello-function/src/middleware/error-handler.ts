import type { Request, Response } from "express";
import type { NextFunction } from "express";
import { AppError } from "../errors/app-error.js";

const safeErrorTypes = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ReferenceError",
  "AggregateError",
  "AppError",
  "ZodError",
  "DatabaseError",
  "ConnectionError",
]);

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const candidateName = error instanceof Error ? error.name : "NonError";
  const errorType = safeErrorTypes.has(candidateName) ? candidateName : "UnknownError";

  console.error(JSON.stringify({
    event: "http_request_error",
    method: req.method,
    route: req.route?.path ?? "unmatched",
    statusCode,
    errorType,
  }));

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  res.status(500).json({
    message: "Error interno del servidor",
  });
}
