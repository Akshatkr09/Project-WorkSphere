# WorkSphere — Delivery Plan

This plan follows `PROJECT 01.pdf` (Version 1.0). Work is delivered in implementation milestones; the numbered assessments remain the evaluator's reference.

## Product scope
A multi-tenant project-management and workflow platform. Organizations manage teams, invitations, projects, milestones, tasks/subtasks, comments, attachments, activity history, workflow rules, notifications, analytics and audit logs. Roles: platform administrator, organization owner, project manager, team member and auditor.

## Agreed service boundaries
- **Next.js frontend:** presentation, accessible navigation, forms, query/cache state and route-level UX. Client-side role selectors are preview aids only.
- **Express API:** authoritative business rules, authentication, tenant scoping, persistence, invitations, projects/tasks/comments/activity, audit and queue orchestration.
- **PostgreSQL:** system of record. Prisma is the selected ORM; migrations and constraints are authoritative.
- **Redis/BullMQ:** cache and asynchronous, retryable jobs. No authoritative business records in Redis.
- **FastAPI:** independently deployable analytics and streaming activity-export processing. API-to-service calls use a dedicated service credential.
- **Integrations:** adapter interfaces; sandbox/local adapters by default. Secrets are environment-only.

## Assessment delivery matrix

| Assessment | Required outcome | Evidence gate |
|---|---|---|
| 01 Frontend architecture | Responsive Next.js App Router; separate role-aware layouts; deliberate server/client components; reusable validated forms; accessible protected pages | UI flows, component tests, accessibility notes; clearly label demo data |
| 02 Express core API | Versioned REST routes for organizations, invitations, teams, projects, milestones, tasks, comments and activity; routes/controllers/services/repositories/validation/middleware | API tests incl. invalid payload, authorization and failure; OpenAPI/Postman |
| 03 PostgreSQL model | Normalized tenant-aware schema, FK/unique constraints, indexes, migrations, transaction/concurrency decisions | migration history, ERD, seed, DB integration tests |
| 04 Authentication/authorization | Short-lived access tokens, refresh rotation, logout/revocation, RBAC, per-record tenant checks | auth/permission/tenant-boundary tests; no frontend-only security |
| 05 Python processing | Streaming large activity exports; productivity metrics, overdue detection, CSV/JSON output | sample input/output, invalid data tests, correctness/performance benchmark |
| 06 FastAPI analytics | Independent analytics API for project health, workload, cycle time and delivery; Pydantic validation, service auth, health/readiness | HTTPX/pytest tests, sample requests, benchmark |
| 07 Realtime/jobs | Task/project updates, reminders/notifications/analytics jobs, retry/idempotency/dead-letter/restart safety | duplicate delivery and restart/failure tests |
| 08 Integrations | Email, object storage, calendar or webhook; sandbox subscription only if plans included; signed webhook and deduplication | adapter tests, signature and duplicate-event evidence; disclose sandbox/mock |
| 09 Docker/environments | Multi-stage app images; non-root processes; healthy dependencies; persistent volumes; internal networks; env templates | reproducible Compose build/run and health evidence |
| 10 Git collaboration | feature branches, meaningful commits, PRs, CODEOWNERS, review checklist, issue tracking, conflict resolution | visible branches/PRs/issues and readable history |
| 11 CI/CD | GitHub Actions checks, tests, scans, image build/publish, staging deploy, approval gate and rollback | successful workflow runs; deployment secrets configured outside repo |
| 12 Testing strategy | frontend, Node unit/API, Python, DB integration, Playwright E2E; tenant, concurrency, permissions, retries and failures | coverage/test report and regression suite |
| 13 API documentation | OpenAPI/Swagger for both services; auth, examples, errors, pagination, webhooks, rate limits, versioning | accessible docs and Postman collection |
| 14 Production deployment | host, DNS, HTTPS, reverse proxy, private DB, secrets, backups/restore, health/logs/monitoring | live URLs and redacted deployment/restore evidence |
| 15 Architecture/incident response | architecture/data-flow diagrams; drills for DB latency, Redis outage, email failure, duplicate jobs, stale updates and cross-tenant attempts | RCA, logs, recovery proof and capstone race-condition demo |

## Capstone acceptance
Two users update the same task concurrently. Use optimistic concurrency (a version or `updatedAt` precondition), reject stale writes with a conflict response, preserve each successful change in activity history, and ensure notification jobs are deduplicated by a stable event/idempotency key. Add a regression test that exercises the race.

## Engineering gates applied to every milestone
1. Validate all untrusted input at the server boundary.
2. Scope every tenant-owned query through a verified organization membership; never trust a client-supplied tenant ID alone.
3. Use transactions for coupled writes and explicit concurrency controls.
4. Return consistent safe errors with a request/correlation ID; do not expose stack traces or secrets.
5. Paginate/filter large collections; avoid N+1 query patterns.
6. Test success, malformed input, permission/tenant boundary and an expected failure.
7. Document run/configuration, design trade-offs and known limitations.
8. Distinguish complete implementations from demo data, stubs and sandbox adapters.

## Current baseline from chat/repository inspection
- Public GitHub `main` only contains the initial monorepo scaffold commit (`c3d9819`).
- Local working tree (reported by user) additionally contains the Next.js workspace/dashboard, Prisma schema/client/seed, FastAPI health service, backend Vitest setup and database/docs work. These local changes are uncommitted and must be preserved.
- PostgreSQL and Redis containers were reported healthy. Prisma schema validation/generation and backend build/typecheck/tests were reported successful. The Prisma migration had not yet been applied.
- Dashboard is visible but currently uses demo data; this is not yet evidence of a connected end-to-end business flow.
- This delivery plan does not mark an assessment complete merely because its folder or screen exists.

## Release checklist
- [ ] All source changes committed and pushed; no secrets or generated build metadata.
- [ ] Fresh clone can install, migrate, seed, run, and test from README.
- [ ] All APIs enforce tenant and role checks server-side.
- [ ] Tests pass and captured outputs correspond to the committed revision.
- [ ] Diagrams, OpenAPI, Postman, Docker and workflow docs match code.
- [ ] External providers are real sandbox integrations or explicitly described local mocks.
- [ ] Deployment is HTTPS-enabled, database is private, backup restore tested.
- [ ] Incident drills and concurrent task-update capstone are demonstrable.
