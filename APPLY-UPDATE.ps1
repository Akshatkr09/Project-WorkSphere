$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if (-not (Test-Path '.git')) { throw 'Run this from the WorkSphere repository root.' }

$append = @'
# Generated TypeScript build metadata
*.tsbuildinfo

# Local backups
database-backup-*/
WorkSphere-Current.zip
'@
$gitignore = Join-Path $root '.gitignore'
$current = Get-Content $gitignore -Raw
if ($current -notmatch '(?m)^\*\.tsbuildinfo$') {
    Add-Content -Path $gitignore -Value $append
}

$zip = Join-Path $env:USERPROFILE 'Downloads\WorkSphere-Next-Update.zip'
if (-not (Test-Path $zip)) { $zip = Join-Path $env:USERPROFILE 'Desktop\WorkSphere-Next-Update.zip' }
if (-not (Test-Path $zip)) { throw "Copy WorkSphere-Next-Update.zip to Downloads or Desktop first." }
Expand-Archive -Path $zip -DestinationPath $root -Force
Write-Host 'WorkSphere documentation and engineering workflow update applied.'
Write-Host 'Your .env and existing application source files were not included in this ZIP.'
git status --short
