
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../index.js";

describe("Autenticación", () => {
    it("debe rechazar una petición sin token", async () => {
        const response = await request(app)
            .get("/api/v1/auth/me");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe(
            "Token de autenticación requerido"
        );
    });
    it("debe rechazar un token manipulado", async () => {
        const response = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", "Bearer token-falso");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe(
            "Token inválido o expirado"
        );
    });

    it("debe iniciar sesión con credenciales correctas", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "fernando@example.com",
                password: "Password123!",
            });

        expect(response.status).toBe(200);
        expect(response.body.token).toEqual(expect.any(String));
        expect(response.body.token.length).toBeGreaterThan(0);
    });


    it("debe rechazar credenciales incorrectas", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "fernando@example.com",
                password: "ContraseñaIncorrecta123!",
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe(
            "Credenciales inválidas"
        );
        expect(response.body.token).toBeUndefined();
    });


    it("debe rechazar datos de login inválidos", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "correo-invalido",
                password: "",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Datos de login inválidos"
        );
        expect(response.body.token).toBeUndefined();
    });


    it("debe permitir consultar al usuario autenticado", async () => {
        const loginResponse = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "fernando@example.com",
                password: "Password123!",
            });

        expect(loginResponse.status).toBe(200);

        const token = loginResponse.body.token;

        const response = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe(
            "Autenticación correcta"
        );
        expect(response.body.userId).toBe(
            "e45a44bb-128a-4e58-bb68-05bb4f838ee4"
        );
    });

    it("debe rechazar el login de un usuario inexistente", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "usuario.inexistente@example.com",
                password: "Password123!",
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe(
            "Credenciales inválidas"
        );
        expect(response.body.token).toBeUndefined();
    });

    it("debe rechazar el login cuando faltan campos", async () => {
        const response = await request(app)
            .post("/api/v1/auth/login")
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Datos de login inválidos"
        );
        expect(response.body.token).toBeUndefined();
    });

    it("debe rechazar un esquema de autorización incorrecto", async () => {
        const response = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", "Basic token-falso");

        expect(response.status).toBe(401);
    });

});
