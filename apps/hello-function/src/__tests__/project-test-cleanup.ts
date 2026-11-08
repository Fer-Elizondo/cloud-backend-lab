export interface CreatedProjectFixture {
  id: string;
  ownerToken: string;
}

interface ProjectCandidate {
  id?: unknown;
  name?: unknown;
}

interface RegisterProjectFixtureOptions {
  expectedName: string;
  ownerToken: string;
  responseId?: unknown;
  responseName?: unknown;
  registry: CreatedProjectFixture[];
  findByExactName: (name: string) => Promise<ProjectCandidate | undefined>;
  reportProblem: () => void;
}

const projectIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isProjectId(value: unknown): value is string {
  return typeof value === "string" && projectIdPattern.test(value);
}

export async function registerCreatedProject({
  expectedName,
  ownerToken,
  responseId,
  responseName,
  registry,
  findByExactName,
  reportProblem,
}: RegisterProjectFixtureOptions): Promise<boolean> {
  let candidate: ProjectCandidate | undefined;

  if (isProjectId(responseId) && responseName === expectedName) {
    candidate = { id: responseId, name: responseName };
  } else {
    try {
      candidate = await findByExactName(expectedName);
    } catch {
      reportProblem();
      return false;
    }
  }

  if (candidate?.name !== expectedName || !isProjectId(candidate.id)) {
    reportProblem();
    return false;
  }

  if (!registry.some((project) => project.id === candidate!.id)) {
    registry.push({ id: candidate.id, ownerToken });
  }
  return true;
}

export async function cleanupCreatedProjects(
  projects: readonly CreatedProjectFixture[],
  deleteProject: (project: CreatedProjectFixture) => Promise<number>
): Promise<void> {
  const cleanupFailures: string[] = [];
  for (const project of projects) {
    try {
      const status = await deleteProject(project);
      if (status !== 200 && status !== 404) {
        cleanupFailures.push("unexpected response");
      }
    } catch {
      cleanupFailures.push("request failed");
    }
  }

  if (cleanupFailures.length > 0) {
    throw new Error(`Project test cleanup failed for ${cleanupFailures.length} fixture(s)`);
  }
}
