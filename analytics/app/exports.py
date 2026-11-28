import csv
import io
import json
from collections.abc import Iterator
from uuid import UUID

from .config import get_settings
from .db import connection


EXPORT_SQL = '''
SELECT a.id::text AS activity_id, a."organizationId"::text AS organization_id,
       a."projectId"::text AS project_id, a."taskId"::text AS task_id,
       a."actorId"::text AS actor_id, a.action, a."entityType" AS entity_type,
       a."entityId"::text AS entity_id, a.changes, a."requestId" AS request_id,
       a."createdAt" AS created_at
FROM "ActivityLog" a
WHERE a."organizationId" = %s
  AND (%s::uuid IS NULL OR a."projectId" = %s::uuid)
ORDER BY a."createdAt" ASC, a.id ASC
'''


def stream_activity_export(organization_id: UUID, project_id: UUID | None, output_format: str) -> Iterator[str]:
    settings = get_settings()
    with connection() as conn:
        with conn.cursor(name="worksphere_activity_export") as cursor:
            cursor.itersize = settings.export_batch_size
            cursor.execute(EXPORT_SQL, (str(organization_id), str(project_id) if project_id else None,
                                        str(project_id) if project_id else None))
            columns = [item.name for item in cursor.description]
            if output_format == "csv":
                buffer = io.StringIO()
                writer = csv.DictWriter(buffer, fieldnames=columns)
                writer.writeheader()
                yield buffer.getvalue()
                while rows := cursor.fetchmany(settings.export_batch_size):
                    for row in rows:
                        buffer = io.StringIO()
                        writer = csv.DictWriter(buffer, fieldnames=columns)
                        writer.writerow({key: value.isoformat() if hasattr(value, "isoformat") else value
                                         for key, value in row.items()})
                        yield buffer.getvalue()
            else:
                while rows := cursor.fetchmany(settings.export_batch_size):
                    for row in rows:
                        serializable = {key: value.isoformat() if hasattr(value, "isoformat") else value
                                        for key, value in row.items()}
                        yield json.dumps(serializable, separators=(",", ":")) + "\n"
