# Genera el ejecutable de campo: build del frontend embebido + backend
# autocontenido (win-x64), sin depender de .NET ni Node instalados en la
# maquina destino. Uso: desde la raiz del repo, powershell -File scripts/build-campo.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $repoRoot "frontend"
$backend = Join-Path $repoRoot "backend/ModbusScada.Api"
$wwwroot = Join-Path $backend "wwwroot"
$publishDir = Join-Path $backend "publish/campo"

Write-Host "== 1/3 Build del frontend (modo campo, URLs relativas) ==" -ForegroundColor Cyan
Push-Location $frontend
npm run build:campo
Pop-Location

Write-Host "== 2/3 Copiando build a wwwroot del backend ==" -ForegroundColor Cyan
if (Test-Path $wwwroot) { Remove-Item -Recurse -Force $wwwroot }
Copy-Item -Recurse (Join-Path $frontend "dist") $wwwroot

Write-Host "== 3/3 Publicando backend autocontenido (win-x64) ==" -ForegroundColor Cyan
if (Test-Path $publishDir) { Remove-Item -Recurse -Force $publishDir }
dotnet publish (Join-Path $backend "ModbusScada.Api.csproj") `
    -c Release -r win-x64 --self-contained true `
    -p:PublishSingleFile=true `
    -o $publishDir

Write-Host "== 4/4 Copiando el sidecar para Tauri ==" -ForegroundColor Cyan
$tauriBinaries = Join-Path $frontend "src-tauri/binaries"
New-Item -ItemType Directory -Force -Path $tauriBinaries | Out-Null
Copy-Item (Join-Path $publishDir "ModbusScada.Api.exe") (Join-Path $tauriBinaries "modbus-scada-api-x86_64-pc-windows-msvc.exe") -Force
Copy-Item (Join-Path $publishDir "appsettings.json") $tauriBinaries -Force
Copy-Item (Join-Path $publishDir "appsettings.Campo.json") $tauriBinaries -Force
$tauriWwwroot = Join-Path $tauriBinaries "wwwroot"
if (Test-Path $tauriWwwroot) { Remove-Item -Recurse -Force $tauriWwwroot }
Copy-Item -Recurse (Join-Path $publishDir "wwwroot") $tauriWwwroot

Write-Host "`nListo: $publishDir" -ForegroundColor Green
Write-Host "Para probarlo sin Tauri: powershell -File scripts/run-campo.ps1"
Write-Host "Para probarlo con Tauri: cd frontend; npm run tauri:dev"
