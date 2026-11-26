# Local Development Setup (Windows PowerShell)

Run commands from `C:\Project-WorkSphere`.

## JavaScript

```powershell
Copy-Item .env.example .env
npm install
```

## Python analytics service

```powershell
py -3.11 -m venv analytics-service\.venv
.\analytics-service\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r analytics-service\requirements.txt
```

If PowerShell blocks activation for this terminal, use:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\analytics-service\.venv\Scripts\Activate.ps1
```

## Infrastructure

Ensure Docker Desktop is running, then:
```powershell
docker compose up -d
docker compose ps
```

## Start each application in a separate terminal

```powershell
npm run dev:frontend
```

```powershell
npm run dev:backend
```

```powershell
.\analytics-service\.venv\Scripts\Activate.ps1
uvicorn app.main:app --app-dir analytics-service --reload --host 127.0.0.1 --port 8000
```

## Stop local infrastructure

```powershell
docker compose down
```

This preserves named database/cache volumes. To delete local database/cache data as well, use `docker compose down -v` only when you intentionally want a full local reset.
