# WorkSphere database setup — Milestone 2.1

## Scope
Adds PostgreSQL schema management with Prisma for users, organizations, memberships, invitations, teams, projects, milestones, tasks, comments, attachments, and activity history. It does not add authentication routes, UI screens, queue workers, or AI features. Gemini is not needed in this milestone.

## Tenant model
- A global `User` can join multiple organizations through `Membership`.
- `User.platformRole` is separate from organization membership roles.
- Organization-owned records carry `organizationId`. Every future API query must scope access to the authenticated organization; knowing a UUID is not authorization.
- `Task.version` is an optimistic-concurrency field for rejecting stale updates.
- Write important `ActivityLog` entries in the same transaction as the business change.

## Setup (PowerShell, from C:\Project-WorkSphere)
1. `npm install`
2. If `.env` does not exist: `Copy-Item .env.example .env`
3. `docker compose up -d postgres redis`
4. `npm run db:generate --workspace backend`
5. `npm run db:migrate --workspace backend -- --name init`
6. `npm run db:seed --workspace backend`
7. Optional: `npm run db:studio --workspace backend`

## Useful commands
- `npm run db:generate --workspace backend`
- `npm run db:migrate --workspace backend -- --name describe_your_change`
- `npm run db:deploy --workspace backend`
- `npm run db:seed --workspace backend`
- `npm run typecheck --workspace backend`
- `npm run test --workspace backend`

Use `db:migrate` for local development. Use `db:deploy` to apply committed migrations in deployment environments. Do not generate migrations on production.

## Engineering notes
- Never commit `.env` or real credentials.
- Keep Prisma access behind backend service/repository modules, not route handlers.
- Tenant isolation must be enforced in backend queries and tested with two organizations.
- Task updates must compare the submitted version with the stored version and increment atomically; stale versions should produce a conflict.
- Keep activity history in the same transaction as the change.
- Seed data is synthetic and is not an authentication-ready account.
