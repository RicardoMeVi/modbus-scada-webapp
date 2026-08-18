# Lanza el ejecutable ya publicado en modo Campo (ver build-campo.ps1).
# Este wrapper es solo para pruebas manuales -- el sidecar de Tauri (etapa 3)
# fija la misma variable de forma programatica y no lo necesita.

$repoRoot = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $repoRoot "backend/ModbusScada.Api/publish/campo/ModbusScada.Api.exe"

if (-not (Test-Path $exe)) {
    Write-Host "No se encontro el ejecutable. Corre primero: powershell -File scripts/build-campo.ps1" -ForegroundColor Red
    exit 1
}

$env:ASPNETCORE_ENVIRONMENT = "Campo"
& $exe
