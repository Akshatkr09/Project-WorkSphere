from typing import Annotated, Literal
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse

from .config import get_settings
from .db import connection
from .exports import stream_activity_export
from . import queries
from .security import require_service_token

app = FastAPI(title="WorkSphere Analytics API", version="1.0.0",
              description="Tenant-scoped project analytics and streaming activity exports.")
ServiceAuth = Annotated[None, Depends(require_service_token)]


@app.get("/health/live", tags=["health"])
def liveness():
    return {"status": "ok", "service": "worksphere-analytics"}


@app.get("/health/ready", tags=["health"])
def readiness():
    try:
        with connection() as conn:
            conn.execute("SELECT 1")
        return {"status": "ready", "database": "reachable"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Analytics database is unavailable") from exc


@app.get("/v1/organizations/{organization_id}/projects/{project_id}/health", dependencies=[Depends(require_service_token)])
def project_health(organization_id: UUID, project_id: UUID):
    result = queries.project_health(organization_id, project_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@app.get("/v1/organizations/{organization_id}/projects/{project_id}/workload", dependencies=[Depends(require_service_token)])
def project_workload(organization_id: UUID, project_id: UUID):
    health = queries.project_health(organization_id, project_id)
    if health is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project_id": str(project_id), "assignees": queries.workload(organization_id, project_id)}


@app.get("/v1/organizations/{organization_id}/projects/{project_id}/cycle-time", dependencies=[Depends(require_service_token)])
def project_cycle_time(organization_id: UUID, project_id: UUID):
    if queries.project_health(organization_id, project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return queries.cycle_time(organization_id, project_id)


@app.get("/v1/organizations/{organization_id}/projects/{project_id}/delivery", dependencies=[Depends(require_service_token)])
def project_delivery(organization_id: UUID, project_id: UUID):
    if queries.project_health(organization_id, project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return queries.delivery(organization_id, project_id)


@app.get("/v1/organizations/{organization_id}/activity/export", dependencies=[Depends(require_service_token)])
def export_activity(organization_id: UUID, format: Literal["csv", "jsonl"] = Query(default="csv"),
                    project_id: UUID | None = Query(default=None)):
    filename = f"worksphere-activity-{organization_id}.{format if format == 'csv' else 'jsonl'}"
    media_type = "text/csv; charset=utf-8" if format == "csv" else "application/x-ndjson"
    return StreamingResponse(stream_activity_export(organization_id, project_id, format), media_type=media_type,
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})
