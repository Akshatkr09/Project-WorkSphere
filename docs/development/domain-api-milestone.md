# WorkSphere domain API milestone

This milestone extends the existing Express API with tenant-scoped team management,
project membership management, and project milestones. It also corrects access-token
error handling so malformed, invalid, and expired bearer tokens return HTTP 401.

## Routes

All routes are under `/api/v1` and require a valid bearer access token unless stated otherwise.

### Teams

- `GET /teams?page=1&pageSize=20` — list teams in the active organization.
- `POST /teams` — create a team (OWNER, ADMIN, PROJECT_MANAGER).
- `GET /teams/:teamId` — read a team and its members.
- `PATCH /teams/:teamId` — update a team (workspace managers).
- `DELETE /teams/:teamId` — delete a team (workspace managers); project team references are set null by the schema.
- `POST /teams/:teamId/members` — add or update a team member (workspace managers).
- `DELETE /teams/:teamId/members/:userId` — remove a team member (workspace managers).

A team member must have an ACTIVE membership in the same organization.

### Project members

- `GET /projects/:projectId/members` — list members when the caller can read the project.
- `POST /projects/:projectId/members` — add or update a project member.
- `PATCH /projects/:projectId/members/:userId` — change a project role.
- `DELETE /projects/:projectId/members/:userId` — remove a project member.

Only workspace OWNER/ADMIN/PROJECT_MANAGER or an existing project MANAGER can manage project membership.
The target user must be an ACTIVE member of the same organization.

### Milestones

- `GET /projects/:projectId/milestones` — list milestones for a readable project.
- `POST /projects/:projectId/milestones` — create a milestone for a writable project.
- `PATCH /projects/:projectId/milestones/:milestoneId` — update name, description, due date, or completion state.
- `DELETE /projects/:projectId/milestones/:milestoneId` — delete a milestone from the specified project.

Milestone mutations append activity events. Deleting a milestone follows the existing schema's
`SetNull` behavior for related task milestone references.

## Security and behavior notes

- Organization IDs always come from the authenticated membership, never the request body.
- Team, project, and milestone lookups are scoped to the active organization/project.
- Project membership changes are restricted to project managers and workspace managers.
- Team/project member additions validate active workspace membership before writing.
- Duplicate team/project member additions are idempotent upserts.
- Invalid/expired JWTs return 401; membership lookup failures continue to the centralized error handler.
- The existing JWT refresh token transport remains JSON for the current development milestone.
  Production browser deployment still needs HttpOnly Secure cookies and CSRF protection.
- Public self-registration must be gated or disabled before a production launch.

## Verification

From the repository root:

```powershell
npm run typecheck --workspace backend
npm run test:backend
npm run build --workspace backend
```

The routes use the existing Prisma schema and do not require a database migration.
