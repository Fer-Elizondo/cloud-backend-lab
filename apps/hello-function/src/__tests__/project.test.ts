
import { afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import {
    cleanupCreatedProjects,
    registerCreatedProject,
    type CreatedProjectFixture,
} from "./project-test-cleanup.js";

// Guarda el JWT del usuario principal durante cada prueba.
let token: string;


const createdProjects: CreatedProjectFixture[] = [];

async function recoverProjectByExactName(name: string, ownerToken: string) {
    const response = await request(app)
        .get("/api/v1/projects")
        .set("Authorization", `Bearer ${ownerToken}`);
    if (response.status !== 200 || !Array.isArray(response.body)) return undefined;
    return response.body.find(
        (project: { id?: unknown; name?: unknown }) => project.name === name
    );
}

async function registerProjectResponse(
    name: string,
    ownerToken: string,
    responseBody?: { id?: unknown; name?: unknown }
) {
    return registerCreatedProject({
        expectedName: name,
        ownerToken,
        responseId: responseBody?.id,
        responseName: responseBody?.name,
        registry: createdProjects,
        findByExactName: (expectedName) => recoverProjectByExactName(expectedName, ownerToken),
        reportProblem: () => console.error(
            "Project test fixture could not be identified safely for cleanup"
        ),
    });
}

async function postTestProject(ownerToken: string, name: string, description: string) {
    let response;
    try {
        response = await request(app)
            .post("/api/v1/projects")
            .set("Authorization", `Bearer ${ownerToken}`)
            .send({ name, description });
    } catch (error) {
        await registerProjectResponse(name, ownerToken);
        throw error;
    }

    const registered = await registerProjectResponse(name, ownerToken, response.body);
    if (!registered) {
        throw new Error("Project test fixture could not be identified safely for cleanup");
    }
    expect(response.status).toBe(201);
    return response.body;
}

async function login() {
    const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
            email: "fernando@example.com",
            password: "Password123!",
        });

    expect(response.status).toBe(200);
    return response.body.token as string;
}

async function loginSecondUser() {
    const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
            email: "usuario.prueba@example.com",
            password: "Password123!",
        });

    expect(response.status).toBe(200);
    return response.body.token as string;
}

async function createTestProject() {
    return postTestProject(
        token,
        `Proyecto de prueba ${crypto.randomUUID()}`,
        "Registro creado por las pruebas automatizadas"
    );
}


async function createProjectForSecondUser(secondUserToken: string) {
    return postTestProject(
        secondUserToken,
        `Proyecto usuario B ${crypto.randomUUID()}`,
        "Proyecto para probar aislamiento entre usuarios"
    );
}


afterAll(async () => {
    await cleanupCreatedProjects(createdProjects, async (project) => {
        const response = await request(app)
            .delete(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${project.ownerToken}`);
        return response.status;
    });
});

describe("Consultas de proyectos", () => {
    it("debe listar los proyectos del usuario autenticado", async () => {
        token = await login();
        const project = await createTestProject();

        const response = await request(app)
            .get("/api/v1/projects")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        expect(
            response.body.some(
                (item: { id: string }) => item.id === project.id
            )
        ).toBe(true);
    });

    it("debe consultar un proyecto propio por su ID", async () => {
        token = await login();
        const project = await createTestProject();

        const response = await request(app)
            .get(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(project.id);
        expect(response.body.name).toBe(project.name);
        expect(response.body.description).toBe(project.description);
        expect(response.body.status).toBe("PLANNED");
    });

    it("debe rechazar un ID de proyecto que no sea UUID", async () => {
        token = await login();

        const response = await request(app)
            .get("/api/v1/projects/id-invalido")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "El ID del proyecto debe ser un UUID válido"
        );
    });

    it("debe devolver 404 cuando el proyecto no existe", async () => {
        token = await login();

        const response = await request(app)
            .get("/api/v1/projects/00000000-0000-4000-8000-000000000001")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Proyecto no encontrado");
    });

    it("debe rechazar la creación de un proyecto con datos inválidos", async () => {
        token = await login();

        const response = await request(app)
            .post("/api/v1/projects")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "",
                description: "Prueba inválida",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Datos de proyecto inválidos"
        );
    });


    it("debe impedir consultar un proyecto de otro usuario", async () => {
        token = await login();

        const secondUserToken = await loginSecondUser();
        const project = await createProjectForSecondUser(secondUserToken);

        const response = await request(app)
            .get(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Proyecto no encontrado");
    });

    it("debe impedir actualizar un proyecto de otro usuario", async () => {
        token = await login();

        const secondUserToken = await loginSecondUser();
        const project = await createProjectForSecondUser(secondUserToken);

        const response = await request(app)
            .put(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Proyecto secuestrado",
                description: "Intento de modificación no autorizada",
                status: "COMPLETED",
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Proyecto no encontrado");

        const ownerResponse = await request(app)
            .get(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${secondUserToken}`);

        expect(ownerResponse.status).toBe(200);
        expect(ownerResponse.body.name).toBe(project.name);
        expect(ownerResponse.body.status).toBe("PLANNED");
    });


    it("debe impedir eliminar un proyecto de otro usuario", async () => {
        token = await login();

        const secondUserToken = await loginSecondUser();
        const project = await createProjectForSecondUser(secondUserToken);

        const response = await request(app)
            .delete(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Proyecto no encontrado");

        const ownerResponse = await request(app)
            .get(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${secondUserToken}`);

        expect(ownerResponse.status).toBe(200);
        expect(ownerResponse.body.id).toBe(project.id);
        expect(ownerResponse.body.name).toBe(project.name);
    });


    it("debe crear un proyecto con estado inicial PLANNED", async () => {
        token = await login();

        const project = await postTestProject(
            token,
            `Proyecto creado ${crypto.randomUUID()}`,
            "Prueba de creación automatizada"
        );

        expect(project.id).toEqual(expect.any(String));
        expect(project.name).toContain("Proyecto creado");
        expect(project.description).toBe(
            "Prueba de creación automatizada"
        );
        expect(project.status).toBe("PLANNED");

    });

    it("debe rechazar la creación de un proyecto con nombre vacío", async () => {
        token = await login();

        const response = await request(app)
            .post("/api/v1/projects")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "   ",
                description: "Este proyecto no debería crearse",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Datos de proyecto inválidos"
        );
    });


    it("debe actualizar un proyecto propio", async () => {
        token = await login();
        const project = await createTestProject();

        const response = await request(app)
            .put(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Proyecto actualizado por Vitest",
                description: "Descripción actualizada",
                status: "IN_PROGRESS",
            });

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(project.id);
        expect(response.body.name).toBe("Proyecto actualizado por Vitest");
        expect(response.body.description).toBe("Descripción actualizada");
        expect(response.body.status).toBe("IN_PROGRESS");
    });


    it("debe rechazar una actualización con estado inválido", async () => {
        token = await login();
        const project = await createTestProject();

        const response = await request(app)
            .put(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Proyecto con estado inválido",
                description: "Prueba de validación",
                status: "PENDING",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Datos de proyecto inválidos"
        );

        const currentProject = await request(app)
            .get(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(currentProject.status).toBe(200);
        expect(currentProject.body.status).toBe("PLANNED");
    });


    it("debe rechazar una actualización que incluya userId", async () => {
        token = await login();
        const project = await createTestProject();

        const response = await request(app)
            .put(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Intento de cambiar propietario",
                description: "Prueba de seguridad",
                status: "COMPLETED",
                userId: "634a3d11-0db9-4136-b573-40ff9d966b3e",
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Datos de proyecto inválidos"
        );

        const currentProject = await request(app)
            .get(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(currentProject.status).toBe(200);
        expect(currentProject.body.name).toBe(project.name);
        expect(currentProject.body.status).toBe("PLANNED");
    });



    it("debe devolver 404 al actualizar un proyecto inexistente", async () => {
        token = await login();

        const response = await request(app)
            .put("/api/v1/projects/00000000-0000-4000-8000-000000000001")
            .set("Authorization", `Bearer ${token}`)
            .send({
                name: "Proyecto inexistente",
                description: "No debe guardarse",
                status: "COMPLETED",
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Proyecto no encontrado");
    });


    it("debe eliminar un proyecto propio", async () => {
        token = await login();
        const project = await createTestProject();

        const response = await request(app)
            .delete(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(project.id);

        const projectIndex = createdProjects.findIndex(
            (item) => item.id === project.id
        );

        if (projectIndex !== -1) {
            createdProjects.splice(projectIndex, 1);
        }

        const getResponse = await request(app)
            .get(`/api/v1/projects/${project.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(getResponse.status).toBe(404);
        expect(getResponse.body.message).toBe("Proyecto no encontrado");
    });



});
