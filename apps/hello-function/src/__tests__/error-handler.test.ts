import type { Request, Response, NextFunction } from "express";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../errors/app-error.js";
import { errorHandler } from "../middleware/error-handler.js";

function responseDouble() {
  const body: unknown[] = [];
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn((value: unknown) => body.push(value)),
  } as unknown as Response;
  return { response, body };
}

function requestDouble() {
  return {
    method: "POST",
    route: { path: "/test/:id" },
    body: { password: "request-body-password" },
    headers: { authorization: "Bearer request-token" },
  } as unknown as Request;
}

describe("HTTP error diagnostics", () => {
  it("returns an AppError status and message without logging the message", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { response, body } = responseDouble();
    const expectedMessage = "Credenciales inválidas";

    errorHandler(
      new AppError(expectedMessage, 401),
      requestDouble(),
      response,
      vi.fn() as unknown as NextFunction
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(body).toEqual([{ message: expectedMessage }]);
    const logged = String(log.mock.calls[0]?.[0]);
    expect(logged).toContain("http_request_error");
    expect(logged).not.toContain(expectedMessage);
    expect(logged).not.toContain("request-body-password");
    expect(logged).not.toContain("request-token");
    log.mockRestore();
  });

  it("keeps unexpected errors generic and excludes arbitrary details from logs", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { response, body } = responseDouble();
    const unexpected = Object.assign(
      new Error("secret-token-and-database-password"),
      { name: "secret-token-and-database-password" }
    );

    errorHandler(
      unexpected,
      requestDouble(),
      response,
      vi.fn() as unknown as NextFunction
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(body).toEqual([{ message: "Error interno del servidor" }]);
    const logged = String(log.mock.calls[0]?.[0]);
    expect(logged).toContain("http_request_error");
    expect(logged).not.toContain("secret-token-and-database-password");
    expect(logged).not.toContain("request-body-password");
    expect(logged).not.toContain("request-token");
    log.mockRestore();
  });
});
