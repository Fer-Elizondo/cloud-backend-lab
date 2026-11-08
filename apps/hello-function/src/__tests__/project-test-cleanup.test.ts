import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupCreatedProjects,
  registerCreatedProject,
  type CreatedProjectFixture,
} from "./project-test-cleanup.js";

const expectedName = "Proyecto de prueba 7e4f5e76-29a0-4cb2-8765-81fbc32bc8d8";
const expectedId = "81fbc32b-c8d8-4cb2-8765-7e4f5e7629a0";
const unexpectedId = "3cb50e66-a7b1-4aaf-b2c2-e4a6bf4ff390";

describe("project test fixture cleanup safety", () => {
  let registry: CreatedProjectFixture[];
  let reportProblem: () => void;

  beforeEach(() => {
    registry = [];
    reportProblem = vi.fn<() => void>();
  });

  it("accepts a valid ID only when the response name matches the fixture", async () => {
    const registered = await registerCreatedProject({
      expectedName,
      ownerToken: "fixture-owner-token",
      responseId: expectedId,
      responseName: expectedName,
      registry,
      findByExactName: vi.fn(),
      reportProblem,
    });

    expect(registered).toBe(true);
    expect(registry).toEqual([{ id: expectedId, ownerToken: "fixture-owner-token" }]);
  });

  it("rejects a valid ID with a different response name and does not register it", async () => {
    const findByExactName = vi.fn().mockResolvedValue(undefined);
    const registered = await registerCreatedProject({
      expectedName,
      ownerToken: "fixture-owner-token",
      responseId: unexpectedId,
      responseName: "Existing project owned by test user",
      registry,
      findByExactName,
      reportProblem,
    });

    expect(registered).toBe(false);
    expect(findByExactName).toHaveBeenCalledWith(expectedName);
    expect(registry).toEqual([]);
    expect(reportProblem).toHaveBeenCalledOnce();
  });

  it("recovers a fixture only when the exact-name lookup returns a valid matching project", async () => {
    const recoveredId = "e0c17616-77a2-45f4-afcc-57f69973aa11";
    const findByExactName = vi.fn().mockResolvedValue({
      id: recoveredId,
      name: expectedName,
    });
    const registered = await registerCreatedProject({
      expectedName,
      ownerToken: "fixture-owner-token",
      responseId: unexpectedId,
      responseName: "Unexpected response project",
      registry,
      findByExactName,
      reportProblem,
    });

    expect(registered).toBe(true);
    expect(findByExactName).toHaveBeenCalledWith(expectedName);
    expect(registry).toEqual([{ id: recoveredId, ownerToken: "fixture-owner-token" }]);
    expect(registry.some((project) => project.id === unexpectedId)).toBe(false);
  });

  it("never deletes an ID from a malformed response when exact-name recovery fails", async () => {
    const findByExactName = vi.fn().mockResolvedValue({
      id: unexpectedId,
      name: "A different project",
    });
    await registerCreatedProject({
      expectedName,
      ownerToken: "fixture-owner-token",
      responseId: unexpectedId,
      responseName: undefined,
      registry,
      findByExactName,
      reportProblem,
    });

    const deleteProject = vi.fn().mockResolvedValue(200);
    await cleanupCreatedProjects(registry, deleteProject);

    expect(registry).toEqual([]);
    expect(deleteProject).not.toHaveBeenCalled();
    expect(reportProblem).toHaveBeenCalledOnce();
  });

  it("continues cleaning other registered fixtures after a deletion fails", async () => {
    const projects = [
      { id: expectedId, ownerToken: "owner-a" },
      { id: unexpectedId, ownerToken: "owner-b" },
    ];
    const deleteProject = vi.fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(200);

    await expect(cleanupCreatedProjects(projects, deleteProject)).rejects.toThrow(
      "Project test cleanup failed for 1 fixture(s)"
    );
    expect(deleteProject).toHaveBeenCalledTimes(2);
  });
});
