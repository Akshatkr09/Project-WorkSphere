# Express–FastAPI Analytics Integration

## What is included

- Authenticated Express routes under `/api/v1/analytics`.
- Project-level read authorization using the existing `projectAccessWhere` policy before forwarding any project analytics request.
- Private service-to-service authentication via `x-analytics-service-token`; the token is never returned to or accepted from the browser.
- Streaming passthrough for CSV/JSONL exports so large exports are not buffered in Express memory.
- Organization-wide activity export restricted to workspace-wide roles (`OWNER`, `ADMIN`, `PROJECT_MANAGER`). Other roles must provide a project ID, which is checked against their project read access.
- Upstream unavailability and missing configuration return safe 503 responses.

## Endpoints

All endpoints require the normal WorkSphere user bearer access token.

| Express endpoint | FastAPI endpoint |
|---|---|
| `GET /api/v1/analytics/projects/:projectId/health` | Project health |
| `GET /api/v1/analytics/projects/:projectId/workload` | Project workload |
| `GET /api/v1/analytics/projects/:projectId/cycle-time` | Project cycle time |
| `GET /api/v1/analytics/projects/:projectId/delivery` | Project delivery |
| `GET /api/v1/analytics/activity/export?format=csv&projectId=<uuid>` | Activity export |

`format` accepts `csv` or `jsonl` and defaults to `csv`. Workspace-wide roles may omit `projectId`; other roles must provide it. A supplied project ID is always authorized before forwarding.

## Environment

Set these in the root `.env` (do not commit the real token):

```dotenv
ANALYTICS_SERVICE_URL=http://127.0.0.1:8000
ANALYTICS_SERVICE_TOKEN=<same-random-secret-configured-for-the-analytics-container>
```

The token value must match the `ANALYTICS_SERVICE_TOKEN` used by the FastAPI container. The Express process must be restarted after changing environment variables.

If Express is later run inside Docker Compose, set `ANALYTICS_SERVICE_URL=http://analytics:8000` for that container; `127.0.0.1` would refer to the Express container itself.

## Local verification

From the repository root:

```powershell
npm --workspace backend run typecheck
npm --workspace backend test
npm --workspace backend run build
```

Start the backend with its normal development command, then call the endpoints with a valid WorkSphere bearer token. Do not call FastAPI directly from the browser.

## Security notes and current limits

- Express performs the user authentication and tenant/project authorization. FastAPI independently requires the service token and scopes SQL queries by organization/project IDs supplied by the trusted Express service.
- This integration does not add a frontend dashboard or UI.
- Activity exports for non-workspace-wide users are project-scoped. Workspace-wide roles can export the full organization activity log.
- The Python analytics service currently calculates cycle time from recorded `task.updated` activity entries where `changes.after.status` is `DONE`; historical tasks without that event are excluded. Delivery timing currently uses task `updatedAt` as the completion proxy because the Task model does not yet have a dedicated completion timestamp. Treat these metrics accordingly until task completion history is modeled explicitly.
