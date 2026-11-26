# WorkSphere

Multi-Tenant Project Management & Workflow Automation Platform.

WorkSphere is being developed as a single monorepo containing:
- `frontend/` — Next.js App Router user interface
- `backend/` — Express REST API (primary business API)
- `analytics-service/` — FastAPI analytics/processing service
- `database/` — database design and migrations (introduced incrementally)
- `infrastructure/` — local and deployment infrastructure
- `docs/` — architecture and engineering documentation

## Milestone 1: Architecture & Foundation

This milestone establishes the repository structure, service boundaries, initial health endpoints, local infrastructure configuration, and development documentation. It is a foundation, not the completed product.

## Prerequisites

- Node.js 22.x and npm
- Python 3.11.x
- Docker Desktop with Linux containers enabled
- Git
- VS Code

## Initial setup

1. Copy `.env.example` to `.env` and change the local placeholder password if desired.
2. Install JavaScript dependencies:

   ```powershell
   npm install
   ```

3. Create and activate the Python virtual environment:

   ```powershell
   py -3.11 -m venv analytics-service\.venv
   .\analytics-service\.venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   pip install -r analytics-service\requirements.txt
   ```

4. Start local infrastructure:

   ```powershell
   docker compose up -d
   docker compose ps
   ```

## Run the services

Open separate VS Code terminals from the repository root.

Frontend:
```powershell
npm run dev:frontend
```
Open http://localhost:3000.

Express API:
```powershell
npm run dev:backend
```
Health endpoint: http://localhost:3001/api/v1/health

FastAPI analytics service:
```powershell
.\analytics-service\.venv\Scripts\Activate.ps1
uvicorn app.main:app --app-dir analytics-service --reload --host 127.0.0.1 --port 8000
```
Health endpoint: http://localhost:8000/health
API docs: http://localhost:8000/docs

## Verification

```powershell
npm run typecheck
npm run test:backend
```

From the analytics-service directory (with its virtual environment active):
```powershell
pytest
```

## Architecture principles

- PostgreSQL is the system of record.
- Express owns core business APIs and authoritative business rules.
- FastAPI is a separately bounded processing/analytics service.
- Next.js is the user-facing application.
- Redis is reserved for caching and asynchronous jobs.
- Organization/tenant authorization must be enforced by server-side code.
- Secrets belong in local `.env` files and must never be committed.

## Current scope and known limitations

- Authentication, tenant-aware data models, business modules, migrations, queue workers, integrations, and deployment are not implemented yet.
- PostgreSQL and Redis are provided as local Docker services only.
- The initial health endpoints report service liveness; they do not yet prove database or Redis connectivity.
- Do not use real customer data or production credentials.
