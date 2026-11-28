from collections.abc import Iterator
from typing import Any
from contextlib import contextmanager

from .config import get_settings


@contextmanager
def connection() -> Iterator[Any]:
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not configured")
    import psycopg
    from psycopg.rows import dict_row

    conn = psycopg.connect(settings.database_url, row_factory=dict_row, connect_timeout=5)
    try:
        yield conn
    finally:
        conn.close()
