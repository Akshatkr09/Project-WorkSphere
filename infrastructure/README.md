# Infrastructure

The root `docker-compose.yml` currently provides local PostgreSQL 16 and Redis 7 services with persistent named volumes and health checks.

Application containers, production reverse proxy, TLS, backups, monitoring, and deployment workflows are intentionally deferred to later assessments.
