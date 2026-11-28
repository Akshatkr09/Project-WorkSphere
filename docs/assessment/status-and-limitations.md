# Assessment Status and Known Limitations

This document distinguishes implemented behavior from work that still requires verification. Update it after each assessment run.

| Assessment | Current evidence | Status |
|---|---|---|
| 01 Frontend architecture | Next.js App Router, workspace pages, auth pages, project and task workflows; local typecheck/build passed | Implemented core; role-specific UX/accessibility tests remain |
| 02 Express APIs | Auth, organizations/invitations, teams, projects, milestones, tasks, comments, subtasks, activity routes | Core implemented; expand API tests |
| 03 PostgreSQL | Prisma schema, migrations and PostgreSQL local container | Implemented core; document ERD/index rationale |
| 04 Auth/RBAC | JWT access, refresh rotation/revocation, membership-based authorization and project access policy | Implemented core; production cookie/CSRF hardening remains |
| 05 Python processing | Streaming CSV/JSONL export capability described in analytics milestone | Verify benchmark and large-file memory behavior |
| 06 FastAPI analytics | Health/readiness, analytics endpoints, service-token protection and Express proxy | Implemented core; verify all metrics and failure cases |
| 07 Realtime/jobs | Redis provisioned | Not complete until worker, retries, idempotency and realtime delivery are demonstrated |
| 08 Integrations | Invitation token handoff exists | Email provider, object storage, calendar/webhooks remain |
| 09 Docker | Compose for local services; analytics service container added locally | Review non-root users, internal networks, health checks and worker containers |
| 10 Git collaboration | GitHub repository and commit history | Add PR/branch protection evidence if required |
| 11 CI/CD | CI workflow supplied in this pack | CI only; deployment, registry, approvals and rollback remain |
| 12 Testing | Backend unit/policy tests and Python tests exist | Add Playwright, DB integration, tenant-isolation, concurrency and retry tests |
| 13 API docs | This pack includes a starter OpenAPI contract and Postman collection | Expand endpoint coverage against actual route schemas |
| 14 Deployment | Local Docker environment | Production hosting, HTTPS, secrets, backup/restore and monitoring remain |
| 15 Architecture/incident response | Architecture overview supplied | Run drills and record evidence |

## Known limitations to disclose

- Invitation creation returns a token for an authorized inviter to hand off; email delivery is not complete unless a provider is configured.
- Browser session token storage must be hardened before production; prefer secure HttpOnly cookies and CSRF protection.
- Analytics cycle-time and delivery accuracy depend on reliable completion timestamps and historical event data.
- A successful local build is not equivalent to full end-to-end or production verification.
- Do not describe unimplemented integrations, workers or deployment as complete.
