$ErrorActionPreference = "Stop"
$Root = (Get-Location).Path
if (-not (Test-Path (Join-Path $Root "frontend/package.json"))) {
  throw "Run this script from the WorkSphere repository root (frontend/package.json was not found)."
}
$Backup = Join-Path $Root ("_worksphere_backup_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
New-Item -ItemType Directory -Path $Backup | Out-Null
$Files = @(
"frontend/app/layout.tsx",
"frontend/app/page.tsx",
"frontend/app/(workspace)/layout.tsx",
"frontend/app/(workspace)/dashboard/page.tsx",
"frontend/app/(workspace)/projects/page.tsx",
"frontend/app/(workspace)/tasks/page.tsx",
"frontend/app/(workspace)/team/page.tsx",
"frontend/app/(workspace)/settings/page.tsx",
"frontend/components/workspace-shell.tsx"
)
foreach ($File in $Files) {
  $Target = Join-Path $Root $File
  if (Test-Path $Target) {
    $Dest = Join-Path $Backup $File
    New-Item -ItemType Directory -Force -Path (Split-Path $Dest) | Out-Null
    Copy-Item $Target $Dest -Force
  }
}
Get-ChildItem -Path (Join-Path $PSScriptRoot "frontend") -Recurse -File | ForEach-Object {
  $Relative = $_.FullName.Substring((Join-Path $PSScriptRoot "frontend").Length + 1)
  $Destination = Join-Path $Root ("frontend\" + $Relative)
  New-Item -ItemType Directory -Force -Path (Split-Path $Destination) | Out-Null
  Copy-Item $_.FullName $Destination -Force
}
Write-Host "WorkSphere application completion package applied." -ForegroundColor Green
Write-Host "Backup: $Backup"
Write-Host "The existing .env, database, backend and installed dependencies were not modified."
