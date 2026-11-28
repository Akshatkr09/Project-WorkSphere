# Organization and task collaboration milestone

This milestone extends the existing PostgreSQL/Prisma schema. It does not require a database migration.

## Organization endpoints

All organization endpoints below use the organization in the authenticated access token and require an active membership.

- `GET /api/v1/organization/members?page=1&pageSize=20` — owner/admin member directory.
- `PATCH /api/v1/organization/members/:userId` — owner/admin role or status update. `OWNER` cannot be granted through this endpoint; only an owner may change an existing owner's access; the last active owner is protected. Suspending/leaving a member revokes their refresh sessions for this organization.
- `GET /api/v1/organization/invitations?page=1&pageSize=20` — owner/admin invitation list.
- `POST /api/v1/organization/invitations` — owner/admin invitation creation. Body: `{ "email": "person@example.com", "role": "MEMBER" }`. Roles: `ADMIN`, `PROJECT_MANAGER`, `MEMBER`, `AUDITOR`. `OWNER` cannot be assigned by invitation. Invitations expire after seven days and store only a SHA-256 token hash.
- `DELETE /api/v1/organization/invitations/:invitationId` — revoke a pending invitation.
- `POST /api/v1/invitations/accept` — authenticated user accepts a token. The signed-in account email must match the invitation email. The token is single-use and acceptance plus membership activation are transactional.

The create-invitation response returns the raw one-time `invitationToken` only to the authorized inviter. The current repository does not yet include an email delivery integration; the frontend/backend deployment must hand this token to a trusted email provider over a protected server-side path before invitations are presented as a production-ready email workflow. Do not log or persist the raw token.

## Comments

- `GET /api/v1/tasks/:taskId/comments?page=1&pageSize=20`
- `PATCH /api/v1/tasks/:taskId/comments/:commentId` with `{ "body": "..." }`
- `DELETE /api/v1/tasks/:taskId/comments/:commentId`

Comment reads require project read access. Mutations require project write access. Authors may edit/delete their own comments; workspace owners, admins and project managers may moderate comments. Mutations write activity history transactionally.

Comment creation remains available at `POST /api/v1/tasks/:taskId/comments` from the existing task route.

## Subtasks

- `GET /api/v1/tasks/:taskId/subtasks`
- `POST /api/v1/tasks/:taskId/subtasks` with `{ "title": "...", "description": "...", "priority": "MEDIUM", "dueDate": "2026-12-01T00:00:00.000Z", "assigneeIds": [] }`
- `PATCH /api/v1/tasks/:taskId/subtasks/:subtaskId` with an update and the current `version`.
- `DELETE /api/v1/tasks/:taskId/subtasks/:subtaskId`

Subtasks are one level deep: a parent must be a top-level task. They inherit the parent's project and organization. Assignees must be active members of the same workspace. Updates use optimistic version checks and return `409 VERSION_CONFLICT` when stale. Mutations append activity entries in the same transaction.

## Authorization and implementation notes

- Organization membership is always scoped by the authenticated `organizationId`.
- Invitation acceptance validates the signed access token but intentionally does not require membership in the invited organization before acceptance.
- Invitation tokens are hashed at rest, expire after seven days, and can be consumed only once.
- Role assignment prevents privilege escalation to `OWNER`; `ADMIN` can only be granted by an existing owner.
- The email transport is not implemented in this milestone. Do not claim invitation email delivery is complete.
