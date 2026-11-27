# Assessment 01 — Frontend architecture

## Objective
Build a responsive Next.js App Router interface with role-aware layouts for platform administrators, organization owners, project managers and members; deliberate server/client boundaries; reusable validated forms; accessible navigation; and protected pages.

## Current state
The user-reported local working tree contains a shared workspace shell and pages for dashboard, projects, tasks, team, settings and platform administration. The dashboard was demonstrated using local demo data. TanStack Query, React Hook Form, Zod and Lucide dependencies were installed locally. The role selector must be treated as a UI preview only until Assessment 04 implements server-side authentication and authorization.

## Completion criteria
- [ ] Layout/navigation responsive and keyboard accessible.
- [ ] Role-specific navigation is derived from the authenticated server session (preview mode explicitly labelled demo).
- [ ] Reusable forms use React Hook Form + Zod and display field/server errors.
- [ ] TanStack Query provider and typed API client are centralized.
- [ ] Protected routes are checked server-side; API still independently enforces authorization.
- [ ] Loading, empty, error and success states exist.
- [ ] Component tests cover form validation, navigation and permission-aware rendering.
- [ ] Assessment screenshots/test output recorded.

## Limitations
A rendered dashboard backed by static demo arrays is not a connected multi-tenant application. Do not claim CRUD persistence or secure role enforcement until those flows are connected to Express and Assessment 04.
