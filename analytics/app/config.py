from functools import lru_cache
import os

from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str = ""
    service_token: str = ""
    export_batch_size: int = 1000


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", ""),
        service_token=os.getenv("ANALYTICS_SERVICE_TOKEN", ""),
        export_batch_size=max(100, min(10000, int(os.getenv("ANALYTICS_EXPORT_BATCH_SIZE", "1000")))),
    )
