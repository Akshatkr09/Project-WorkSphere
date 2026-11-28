import hmac

from fastapi import Header, HTTPException, status

from .config import get_settings


def require_service_token(x_analytics_service_token: str | None = Header(default=None)) -> None:
    expected = get_settings().service_token
    if not expected:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Analytics service authentication is not configured")
    if not x_analytics_service_token or not hmac.compare_digest(x_analytics_service_token, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid analytics service credentials")
