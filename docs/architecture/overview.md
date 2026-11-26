# WorkSphere – Architecture Overview

## System shape

WorkSphere is a single repository with independently bounded application services.

```text
Browser
   |
   v
Next.js frontend (port 3000)
   |
   v
Express core API (port 3001) ---------> PostgreSQL
   |                                      (system of record)
   |
   +---- service calls ----------------> FastAPI analytics (port 8000)
   |
   +---- future async jobs ------------> Redis / workers
```

## Service ownership

| Component | Responsibility | Authoritative data |
|---|---|---|
| Next.js | User interface, navigation, forms | None |
| Express | Core business rules and REST API | Organizations, memberships, projects, tasks and collaboration records |
| FastAPI | Bounded processing and analytics | Derived results only; not a duplicate business-data store |
| PostgreSQL | Durable relational persistence | System of record |
| Redis | Cache and asynchronous job coordination | Ephemeral/cache/job state |

## Multi-tenancy boundary

Every organization-owned record must be associated with a tenant/organization identifier. The backend must derive the caller's authorized tenant context and enforce it for every resource access. Frontend filtering is not a security boundary.

Tenant-aware schema constraints, authorization middleware, and cross-tenant tests will be implemented in later milestones.

## Current milestone boundaries

Milestone 1 creates service shells and local infrastructure only. It does not claim to implement authentication, tenant isolation, business entities, or production readiness.
