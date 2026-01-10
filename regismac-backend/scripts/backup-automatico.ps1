# Script de Backup Automático para RegisMAC
# Ejecuta backups automáticos de la base de datos

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$backupScript = Join-Path $scriptPath "backup-database.js"

Write-Host "🔄 Ejecutando backup automático..." -ForegroundColor Cyan

# Cambiar al directorio del proyecto
Set-Location $projectRoot

# Ejecutar script de backup
node $backupScript

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Backup automático completado exitosamente" -ForegroundColor Green
} else {
    Write-Host "`n❌ Error en el backup automático" -ForegroundColor Red
    exit 1
}

