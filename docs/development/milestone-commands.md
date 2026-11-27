# WorkSphere milestone command reference (Windows PowerShell)

Run commands from the repository root unless noted. Do not overwrite `.env`.

## Local start
```powershell
npm install
docker compose up -d
docker compose ps
npm run dev:backend
# separate terminal
npm run dev:frontend
# separate terminal
.\analytics-service\.venv\Scripts\Activate.ps1
uvicorn app.main:app --app-dir analytics-service --reload --host 127.0.0.1 --port 8000
```

## Database workflow
```powershell
npx prisma validate --schema backend/prisma/schema.prisma
npx prisma generate --schema backend/prisma/schema.prisma
npx prisma migrate dev --schema backend/prisma/schema.prisma --name init
npx prisma db seed --schema backend/prisma/schema.prisma
```
Only run the migration after reviewing the schema and confirming the local PostgreSQL container is healthy. A migration modifies the local database; it does not alter your source files.

## Consolidated verification (one round per milestone)
```powershell
npm run typecheck
npm run test:backend
npm run build:frontend
.\analytics-service\.venv\Scripts\Activate.ps1
pytest -q
```

## Safe Git hygiene
```powershell
git status --short
git check-ignore .env
git diff --check
```
Commit only after the milestone verification has completed. Never commit `.env`, secrets, `node_modules`, `.next`, `.venv`, `dist`, `.pytest_cache` or `tsconfig.tsbuildinfo`.
