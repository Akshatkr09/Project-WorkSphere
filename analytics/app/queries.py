from uuid import UUID

from .db import connection


def project_health(organization_id: UUID, project_id: UUID) -> dict:
    sql = """
        SELECT p.id::text AS project_id, p.name, p.status,
               COUNT(t.id)::int AS total_tasks,
               COUNT(t.id) FILTER (WHERE t.status = 'DONE')::int AS completed_tasks,
               COUNT(t.id) FILTER (WHERE t.status <> 'DONE' AND t.due_date < NOW())::int AS overdue_tasks,
               COUNT(t.id) FILTER (WHERE t.status = 'BLOCKED')::int AS blocked_tasks
        FROM "Project" p
        LEFT JOIN "Task" t ON t."projectId" = p.id AND t."organizationId" = p."organizationId"
        WHERE p.id = %s AND p."organizationId" = %s
        GROUP BY p.id, p.name, p.status
    """
    with connection() as conn:
        row = conn.execute(sql, (str(project_id), str(organization_id))).fetchone()
    if row is None:
        return None
    total = row["total_tasks"]
    row["completion_rate"] = round(row["completed_tasks"] / total, 4) if total else 0.0
    return row


def workload(organization_id: UUID, project_id: UUID) -> list[dict]:
    sql = """
        SELECT u.id::text AS user_id, u.name,
               COUNT(DISTINCT ta."taskId")::int AS assigned_tasks,
               COUNT(DISTINCT ta."taskId") FILTER (WHERE t.status = 'DONE')::int AS completed_tasks,
               COUNT(DISTINCT ta."taskId") FILTER (WHERE t.status <> 'DONE' AND t."dueDate" < NOW())::int AS overdue_tasks
        FROM "Project" p
        JOIN "Task" t ON t."projectId" = p.id AND t."organizationId" = p."organizationId"
        JOIN "TaskAssignee" ta ON ta."taskId" = t.id
        JOIN "User" u ON u.id = ta."userId"
        WHERE p.id = %s AND p."organizationId" = %s
        GROUP BY u.id, u.name
        ORDER BY assigned_tasks DESC, u.name ASC
    """
    with connection() as conn:
        return list(conn.execute(sql, (str(project_id), str(organization_id))).fetchall())


def cycle_time(organization_id: UUID, project_id: UUID) -> dict:
    # Task has no completedAt column. Use the first recorded task.updated activity
    # whose changes.after.status is DONE; tasks without that event are excluded.
    sql = """
        WITH completion_events AS (
          SELECT a."taskId", MIN(a."createdAt") AS completed_at
          FROM "ActivityLog" a
          WHERE a."organizationId" = %s AND a."projectId" = %s
            AND a."taskId" IS NOT NULL AND a.action = 'task.updated'
            AND a.changes #>> '{after,status}' = 'DONE'
          GROUP BY a."taskId"
        ), durations AS (
          SELECT EXTRACT(EPOCH FROM (ce.completed_at - t."createdAt")) / 86400.0 AS days
          FROM completion_events ce
          JOIN "Task" t ON t.id = ce."taskId" AND t."organizationId" = %s AND t."projectId" = %s
          WHERE ce.completed_at >= t."createdAt"
        )
        SELECT COUNT(*)::int AS completed_tasks_with_history,
               COALESCE(ROUND(AVG(days)::numeric, 2), 0)::float AS average_cycle_days,
               COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days)::numeric, 2), 0)::float AS median_cycle_days
        FROM durations
    """
    with connection() as conn:
        return conn.execute(sql, (str(organization_id), str(project_id), str(organization_id), str(project_id))).fetchone()


def delivery(organization_id: UUID, project_id: UUID) -> dict:
    sql = """
        SELECT COUNT(*)::int AS total_tasks,
               COUNT(*) FILTER (WHERE status = 'DONE')::int AS delivered_tasks,
               COUNT(*) FILTER (WHERE status <> 'DONE' AND "dueDate" < NOW())::int AS overdue_open_tasks,
               COUNT(*) FILTER (WHERE status = 'DONE' AND "dueDate" IS NOT NULL AND "updatedAt"::date <= "dueDate"::date)::int AS completed_by_due_date
        FROM "Task"
        WHERE "organizationId" = %s AND "projectId" = %s
    """
    with connection() as conn:
        row = conn.execute(sql, (str(organization_id), str(project_id))).fetchone()
    delivered = row["delivered_tasks"]
    row["on_time_completion_rate"] = round(row["completed_by_due_date"] / delivered, 4) if delivered else 0.0
    return row
