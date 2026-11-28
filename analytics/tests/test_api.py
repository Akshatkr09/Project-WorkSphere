from fastapi.testclient import TestClient

from app.main import app
from app.config import get_settings, Settings


def setup_function():
    get_settings.cache_clear()


def test_liveness_is_public(monkeypatch):
    monkeypatch.setenv("ANALYTICS_SERVICE_TOKEN", "test-secret-token-123456789")
    get_settings.cache_clear()
    response = TestClient(app).get("/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_analytics_routes_require_service_token(monkeypatch):
    monkeypatch.setenv("ANALYTICS_SERVICE_TOKEN", "test-secret-token-123456789")
    get_settings.cache_clear()
    client = TestClient(app)
    response = client.get("/v1/organizations/00000000-0000-0000-0000-000000000001/projects/00000000-0000-0000-0000-000000000002/health")
    assert response.status_code == 401


def test_analytics_routes_reject_wrong_service_token(monkeypatch):
    monkeypatch.setenv("ANALYTICS_SERVICE_TOKEN", "test-secret-token-123456789")
    get_settings.cache_clear()
    client = TestClient(app)
    response = client.get(
        "/v1/organizations/00000000-0000-0000-0000-000000000001/projects/00000000-0000-0000-0000-000000000002/health",
        headers={"X-Analytics-Service-Token": "wrong-token"},
    )
    assert response.status_code == 401


def test_analytics_routes_return_503_without_configured_token(monkeypatch):
    monkeypatch.delenv("ANALYTICS_SERVICE_TOKEN", raising=False)
    get_settings.cache_clear()
    client = TestClient(app)
    response = client.get(
        "/v1/organizations/00000000-0000-0000-0000-000000000001/projects/00000000-0000-0000-0000-000000000002/health",
        headers={"X-Analytics-Service-Token": "some-token"},
    )
    assert response.status_code == 503
