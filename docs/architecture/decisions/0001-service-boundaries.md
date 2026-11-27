# ADR 0001: Service boundaries and ownership

**Status:** Accepted  
**Date:** 2026-11-28

## Decision
Next.js is the UI; Express is the primary business API and owns all authoritative workflow writes; PostgreSQL is the system of record; Prisma is the ORM; Redis/BullMQ handles non-authoritative cache and jobs; FastAPI performs analytics and streaming export processing.

## Rationale
This follows the project handbook's required separation and avoids two services independently mutating the same business tables. FastAPI receives validated, minimized payloads from Express or read-only export inputs; it does not become an alternate write path for projects/tasks.

## Consequences
- Express verifies user identity, organization membership, roles and resource ownership for every business endpoint.
- FastAPI service endpoints require a service credential, strict Pydantic schemas, size/time limits and health/readiness routes.
- Job handlers are idempotent and record failure/dead-letter state.
- A service outage must not silently lose a business write; transactional outbox is the preferred bridge between PostgreSQL commits and Redis jobs.
- Provider implementations are adapters. Local/sandbox behavior is clearly labelled in docs and the UI.
