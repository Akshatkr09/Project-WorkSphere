from fastapi import FastAPI

app = FastAPI(
    title="WorkSphere Analytics Service",
    description="Bounded processing and analytics service for WorkSphere.",
    version="0.1.0",
)


@app.get("/health", tags=["Operations"])
def health_check() -> dict[str, str]:
    """Return service liveness. Dependency readiness will be added later."""
    return {
        "status": "ok",
        "service": "worksphere-analytics-service",
    }
