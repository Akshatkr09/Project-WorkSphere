# One-Day WorkSphere Demo Checklist

## Local startup
- [ ] `docker compose up -d postgres redis`
- [ ] Backend API starts and `/api/v1/health` returns 200.
- [ ] Analytics service `/health/live` and `/health/ready` return healthy.
- [ ] Frontend starts at `http://localhost:3000`.

## Product demo
- [ ] Register or log in to a synthetic workspace.
- [ ] Create a project and open its details.
- [ ] Create a task, set priority/status/due date.
- [ ] Change task status and refresh to confirm persistence.
- [ ] Show project members, comments/subtasks if available.
- [ ] Show analytics and activity pages; distinguish empty data from unavailable service.

## Quality checks
- [ ] `npm run typecheck`
- [ ] `npm run test:backend`
- [ ] `npm run build:frontend`
- [ ] `python -m pytest -q` from `analytics-service`
- [ ] `docker compose ps`
- [ ] Capture actual test output and GitHub Actions run.

## Submission
- [ ] Update README with exact local setup and known limitations.
- [ ] Include architecture diagram and API starter spec.
- [ ] Include Postman collection.
- [ ] Record a short screen demo.
- [ ] Do not claim production deployment, email delivery, realtime jobs or integrations unless verified.
