# WorkSphere Security Milestone — Membership and Project Access

## Included
- Authenticated requests reload the user's current workspace membership from PostgreSQL.
- Missing, suspended, or departed memberships are denied immediately.
- Authorization uses the current database role, not the stale JWT role claim.
- Project and task reads are restricted to workspace administrators or explicit project members.
- Project MANAGER and CONTRIBUTOR can read/write tasks and comments; VIEWER is read-only.
- Workspace OWNER, ADMIN, PROJECT_MANAGER retain workspace-wide access.
- Unit tests cover the project access policy matrix.

## Authorization matrix
| Workspace role | Project role | Read | Write tasks/comments |
|---|---|---:|---:|
| OWNER / ADMIN / PROJECT_MANAGER | Any / none | Yes | Yes |
| MEMBER | MANAGER | Yes | Yes |
| MEMBER | CONTRIBUTOR | Yes | Yes |
| MEMBER | VIEWER | Yes | No |
| MEMBER / AUDITOR | None | No | No |
| AUDITOR | Any | Yes if project member | No |

## Not yet covered
This is application-layer authorization, not database-enforced composite tenant foreign keys or PostgreSQL row-level security. Future teams, milestones, invitations, attachments, integrations, and exports routes must apply equivalent tenant/resource checks.

The refresh token is still returned in JSON. Before production browser deployment, use Secure, HttpOnly, SameSite cookies and CSRF protection. Add integration tests against an isolated database for membership suspension, cross-tenant ID guessing, role enforcement, and concurrent writes.

## Apply
Extract the ZIP at the repository root, preserving folder structure. No Prisma schema change or migration is included.
