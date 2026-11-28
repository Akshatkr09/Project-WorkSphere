# Authentication sessions — milestone 2.3

## What changed
- Refresh sessions are persisted in PostgreSQL as SHA-256 token hashes; raw refresh tokens are returned only to the client.
- Refresh tokens rotate on every successful `/api/v1/auth/refresh` call.
- A previously consumed token triggers revocation of all still-active sessions in its token family.
- `/api/v1/auth/logout` revokes the supplied refresh token for the authenticated user and organization.
- Refresh requires an active organization membership.
- Request validation errors now return HTTP 400 with structured field details.
- Common Prisma unique, missing-record, and foreign-key errors map to safe HTTP responses.

## Apply and migrate
1. Back up your local database before changing schema.
2. Apply this update package and run `npm install` if dependencies changed.
3. Run `npm run db:generate --workspace backend`.
4. Create a migration with `npm run db:migrate --workspace backend -- --name auth_refresh_sessions`.
5. Inspect the generated SQL under `backend/prisma/migrations` before applying it to any shared or production database.

The migration adds the `RefreshSession` table and its indexes. It does not alter existing project/task relationships. Tenant-safe composite foreign keys remain a separate schema hardening task and must be completed before production use.

## Endpoints
- `POST /api/v1/auth/register` — creates a user, organization, owner membership, and refresh session.
- `POST /api/v1/auth/login` — authenticates and creates a refresh session.
- `POST /api/v1/auth/refresh` — body `{ "refreshToken": "..." }`; consumes and rotates the token.
- `POST /api/v1/auth/logout` — requires bearer access token; body may include `{ "refreshToken": "..." }`.

## Important deployment notes
- Keep `JWT_ACCESS_SECRET` private and at least 32 characters.
- Store refresh tokens securely on the client. For a browser app, prefer an HttpOnly, Secure, SameSite cookie and CSRF protection rather than localStorage.
- The current API returns refresh tokens in JSON to support local development and API testing. Do not expose this authentication flow publicly until cookie/CSRF policy and rate limiting are implemented.
- Public self-service registration currently allows creation of new organizations. Gate or disable it before production onboarding.
- This milestone does not yet implement invitation acceptance or tenant-composite database constraints.
