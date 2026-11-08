# Cloud Backend Lab

Cloud Backend Lab is a Node.js and TypeScript portfolio project for API design, authentication, PostgreSQL access, automated testing, container packaging, and CI. The implemented application is `hello-function`. A separate `cloud-backend-api` intended for Cloud Run is planned and does not yet exist as an implemented service.

## Project goals

- Build a maintainable HTTP API with controller, service, and repository boundaries.
- Implement authentication and user-scoped project operations backed by PostgreSQL.
- Exercise unit and database-backed integration testing with guarded test destinations.
- Validate CI checks and a production Docker image locally.
- Keep Google Cloud infrastructure and deployment work explicit about what is only declared or planned.

## Current status

| Status | Scope |
| --- | --- |
| **Implemented and validated locally** | `hello-function` Express API; bcrypt password verification and JWT Bearer authentication; Zod validation; user-scoped project CRUD; PostgreSQL through `pg.Pool` with parameterized queries; centralized error handling; 62 unit tests and 24 integration tests passed in recorded validation runs; production Docker image built and exercised with HTTP requests from inside the container. |
| **Implemented, external validation pending** | GitHub Actions CI runs unit and integration suites, builds and packages `hello-function`, and checks the ZIP. A GitHub-hosted run is unconfirmed. A prior read-only Google Cloud inspection confirmed an active `hello-function`; the current CI workflow does not deploy it. Whether the Terraform declarations were applied is unverified. |
| **Planned** | Separate `cloud-backend-api`; Cloud Run and Cloud SQL integration for it; independent Terraform; separate CD workflow using Workload Identity Federation (WIF) with restricted trust and permissions. |

The 62 unit tests and 24 integration tests are results of completed runs, not a guarantee for future executions. Integration validation used a temporary PostgreSQL 16 instance, initialized the schema, loaded fixtures, and passed the database guard. Docker validation built the production image and exercised HTTP requests inside the container. Access through a Windows host-published port remains unverified.
## Technology stack

- Node.js 24, TypeScript, Express 5
- PostgreSQL and `pg.Pool`
- JWT (`jsonwebtoken`) and bcrypt
- Zod request and environment validation
- Vitest and Supertest
- Multi-stage Docker image
- GitHub Actions CI and partial Terraform declarations for Google Cloud

## Architecture

`hello-function` mounts authentication and project routes in its Express entry point. Controllers handle HTTP requests and validation, services implement application operations, and repositories perform PostgreSQL queries. Login uses an authentication service/repository path; protected endpoints use Bearer JWT middleware. A centralized error handler maps application errors to HTTP responses.

~~~mermaid
flowchart LR
    Client --> Express[Express application]
    Express --> AuthRoutes[Authentication routes]
    Express --> ProjectRoutes[Project routes]
    AuthRoutes --> AuthController[Auth controller]
    AuthController --> AuthService[Auth service]
    AuthService --> AuthRepository[Auth repository]
    ProjectRoutes --> Bearer[Bearer JWT middleware]
    Bearer --> ProjectController[Project controller]
    ProjectController --> ProjectService[Project service]
    ProjectService --> ProjectRepository[Project repository]
    AuthRepository --> Pool[pg.Pool]
    ProjectRepository --> Pool
    Pool --> PostgreSQL[(PostgreSQL)]
    Express --> ErrorHandler[Central error handler]
~~~

## Repository structure

~~~text
apps/hello-function/
  src/auth/              Login, JWT middleware, and auth persistence
  src/config/            Environment parsing, pool setup, and DB guard
  src/controllers/       Project HTTP handlers
  src/errors/            Application error type
  src/middleware/        Central error handler
  src/repositories/      PostgreSQL persistence
  src/routes/            Authentication and project routes
  src/schemas/           Zod request schemas
  src/services/          Project operations
  src/__tests__/         Unit and integration tests
  src/index.ts           Express app and Functions Framework export
  src/local.server.ts    Standalone Express server
database/
  schema.sql             PostgreSQL schema, including users/projects/tasks
  seed-test-users.mjs    Guarded integration fixture seeder
docs/                    Project and operations documentation
infrastructure/terraform/ Partial declarations; not proof of deployment
scripts/                 Build cleanup and function packaging utilities
.github/workflows/       GitHub Actions CI
Dockerfile               Multi-stage production image
~~~

`cloud-backend-api` is a roadmap item; there is no corresponding application directory or confirmed Cloud Run service. The database schema includes `tasks`, but task CRUD is not implemented.

## Further documentation

- [Function packaging](docs/function-package.md)
- [GitHub Actions CI review](docs/github-actions-audit.md)
- [Google Cloud and Terraform audit](docs/gcp-infrastructure-audit.md)
- [Dependency security audit](docs/dependency-audit.md)

## Authentication and authorization

`POST /api/v1/auth/login` validates credentials, compares the password with its bcrypt hash, and issues a JWT with a one-hour expiration. Protected routes require a Bearer token. `GET /api/v1/auth/me` returns the authenticated user ID. Project reads and mutations are scoped to the authenticated user. These are implementation observations, not a security certification.

## Database design

`database/schema.sql` defines `users`, `projects`, and `tasks`, with UUID identifiers, timestamps, foreign keys, indexes, and status constraints. The current API implements authentication and project CRUD. PostgreSQL access uses `pg.Pool` and parameterized queries. Cloud SQL connectivity is not implemented or verified.

## Testing

Recorded local validation results: **62 unit tests passed** and **24 integration tests passed** (86 total). Integration tests cover authentication and project endpoints. The setup activates a database destination guard; CI selects `cloud_backend_test`, and local test setup selects `cloud_backend_lab_test`. The workflow applies the schema and loads fixtures before running integration tests.

The recorded integration run used a new, temporary PostgreSQL 16 container isolated from the host database service. Schema initialization and fixture loading succeeded. These results do not guarantee future runs. No coverage percentage is claimed, and GitHub-hosted Actions has not been verified.

From the repository root:

~~~sh
npm ci
npm run test:unit --workspace hello-function
npm run test:integration --workspace hello-function
npm run build:function
npm run package:function
~~~

Integration tests require a disposable database that satisfies the guard's allowed database name, host, and port. Never point them at development or production data. `database/schema.sql` is the current schema initialization script; there is no migration framework in the repository.

## Docker

The Dockerfile separates TypeScript production compilation, production dependency installation (`npm ci --omit=dev`), and the final image. The image contains production dependencies, application package metadata, and compiled `dist-production` output. It starts `local.server.js` on internal port **8080**.

The recorded validation built the image and confirmed Express startup. HTTP probes from inside the container returned **401 without a JWT** and **200 with a valid test JWT**. Access from Windows through a host-published port remains unverified; this does not demonstrate a Cloud Run deployment. Runtime JWT and PostgreSQL configuration must be supplied outside the image.

## CI/CD

`.github/workflows/deploy.yml` is a CI workflow despite its filename. On pushes and pull requests to `main`, it installs dependencies, runs unit tests, provisions PostgreSQL 16, applies the schema, seeds test users, runs integration tests, builds and packages `hello-function`, then checks ZIP integrity and required entries. It does not build the Docker image, authenticate to Google Cloud, upload an artifact, or deploy. A GitHub-hosted run is unconfirmed.

There is no functional CD workflow. A separate CD workflow is planned for `cloud-backend-api`, using WIF with restricted trust and least-privilege permissions reviewed for that API.

## Google Cloud and Terraform roadmap

Terraform declares selected APIs, IAM and WIF resources, a source bucket, and an example Secret Manager secret. It does not declare Cloud SQL, a Cloud Run service, or a Cloud Functions Gen 2 function. A prior read-only inspection confirmed that `hello-function` is active in Google Cloud, but did not establish that the current Terraform configuration was applied or that the deployed source matches this working tree. No GCP deployment is performed by this repository's current CI or by this publication preparation. The separate Cloud Run API remains planned.

The planned path is to implement `cloud-backend-api` separately, design its Cloud Run and Cloud SQL connectivity, define independent infrastructure, configure runtime secret delivery, and create a protected CD workflow using restricted WIF. These are plans, not current capabilities.

## Environment variables

The table lists names and purposes only. Supply values locally or through a runtime secret mechanism; never document or commit real values.

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | JWT signing key; required by the API. |
| `DATABASE_HOST` | PostgreSQL host. |
| `DATABASE_PORT` | PostgreSQL port. |
| `DATABASE_NAME` | PostgreSQL database name. |
| `DATABASE_USER` | PostgreSQL user. |
| `DATABASE_PASSWORD` | PostgreSQL password. |
| `DATABASE_POOL_MAX` | Maximum pool size; defaults to 5. |
| `PORT` | HTTP server port; defaults to 8080. |
| `SHUTDOWN_TIMEOUT_MS` | Graceful shutdown timeout; defaults to 5000 ms. |

Keep `.env` files, credentials, tokens, private keys, Terraform variable files, and Terraform state out of Git.

## Dependency security

The latest recorded `npm audit` reported **6 moderate findings**, with no high or critical findings. Three moderate findings are associated with `uuid` in the production path `@google-cloud/functions-framework` → `cloudevents` → `uuid`. Moderate findings for `minimatch` occur in the development path `archiver` → `readdir-glob` → `minimatch`. No automatic fix or downgrade was applied for these findings. Review the production `uuid` risk before deployment. See [the dependency audit](docs/dependency-audit.md) for versions, advisories, and remediation notes.

## Security considerations

- Keep local environment files, credentials, private keys, Terraform variable files, and Terraform state out of source control.
- Use disposable test databases only; the guard limits recognized destinations but does not make production data safe for tests.
- Fixtures contain static synthetic credentials and must never be reused outside isolated tests.
- Runtime secret delivery from Google Secret Manager is not implemented for this API.
- The controls documented here are code and validation observations, not a comprehensive security assessment.

## Future improvements

- Verify a GitHub-hosted CI run.
- Review the production `uuid` advisory through a compatible dependency path and resolve the development packaging advisory without an unreviewed major downgrade.
- Implement and test the separate `cloud-backend-api`.
- Define and validate Cloud Run, Cloud SQL, runtime secrets, and independent Terraform for that API.
- Create a separate protected CD workflow using restricted WIF and least-privilege identities.
- Add task API operations only if they become part of the product scope.

## Portfolio summary

Cloud Backend Lab is a TypeScript backend portfolio project with a layered Express API, JWT authentication, bcrypt password verification, Zod validation, user-scoped PostgreSQL project CRUD, automated tests, CI packaging, and a locally validated production Docker image. An existing `hello-function` was confirmed active in a prior read-only Google Cloud inspection; its deployed source was not matched to this working tree. The separate Cloud Run API, Cloud SQL integration, Terraform application status, and automated deployment for the new API remain planned or unverified.
