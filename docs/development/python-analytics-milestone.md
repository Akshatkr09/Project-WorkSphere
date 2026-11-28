# WorkSphere Python analytics milestone

## Scope
Adds a Python 3.11 FastAPI analytics service backed by the existing PostgreSQL schema. It provides project health, assignee workload, cycle-time and delivery metrics, plus bounded-memory CSV/JSONL activity exports using a PostgreSQL server-side cursor. Analytics endpoints require `X-Analytics-Service-Token`; liveness is public and readiness checks PostgreSQL connectivity.

## Run locally (PowerShell)
From the repository root:

```powershell
py -3.11 -m venv analytics\.venv
.\analytics\.venv\Scripts\Activate.ps1
python -m pip install -r analytics\requirements.txt
$env:DATABASE_URL = $env:DATABASE_URL
$env:ANALYTICS_SERVICE_TOKEN = "<use-a-long-random-local-secret>"
python -m uvicorn app.main:app --app-dir analytics --host 127.0.0.1 --port 8000
```

The root `.env` is not automatically loaded by Python. Set `DATABASE_URL` and `ANALYTICS_SERVICE_TOKEN` in the process environment before starting the service. Do not commit secrets.

## API
- `GET /health/live` — process liveness, no authentication.
- `GET /health/ready` — PostgreSQL connectivity check.
- `GET /v1/organizations/{organization_id}/projects/{project_id}/health`
- `GET /v1/organizations/{organization_id}/projects/{project_id}/workload`
- `GET /v1/organizations/{organization_id}/projects/{project_id}/cycle-time`
- `GET /v1/organizations/{organization_id}/projects/{project_id}/delivery`
- `GET /v1/organizations/{organization_id}/activity/export?format=csv|jsonl&project_id=<optional UUID>`

Send `X-Analytics-Service-Token` on every analytics endpoint. This is service-to-service authentication, not end-user authentication. The Node API must authenticate the user, authorize organization/project access, and only then call this private service. Do not expose the analytics port publicly in production.

## Metric definitions and limitations
- Project health counts total, completed, overdue-open, and blocked tasks; completion rate is completed / total.
- Workload counts distinct assigned tasks by user.
- Cycle time uses the first `task.updated` activity whose `changes.after.status` is `DONE`. The current Task schema has no `completedAt`; tasks without a matching activity event are excluded. Treat this as an observed-history metric, not a complete historical truth.
- Delivery on-time completion uses `Task.updatedAt` as the available completion proxy because the schema has no dedicated completion timestamp. This can be inaccurate if a DONE task is subsequently edited; do not use it for contractual reporting until a completion timestamp/event is persisted.
- Export streams rows in batches and does not load the full activity table into memory. JSON values and timestamps are serialized per row.

## Tests

```powershell
py -3.11 -m pip install -r analytics\requirements.txt
python -m pytest analytics\tests -q
```

The tests cover liveness and service-token enforcement. Database-backed metric correctness and large-export benchmarking require a running PostgreSQL instance and are not claimed by this unit test suite.
