# Script PowerShell para verificar y corregir usuarios técnicos
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RegisMAC - Corrección de Usuarios Técnicos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del backend
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Split-Path -Parent $scriptPath
Set-Location $backendPath

Write-Host "📦 Verificando dependencias..." -ForegroundColor Yellow

# Verificar si node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules no encontrado. Instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
        exit 1
    }
}

# Generar Prisma Client
Write-Host "🔧 Generando Prisma Client..." -ForegroundColor Yellow
$prismaPath = Join-Path $backendPath "node_modules\.bin\prisma.cmd"
if (Test-Path $prismaPath) {
    & $prismaPath generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Advertencia: No se pudo generar Prisma Client automáticamente" -ForegroundColor Yellow
        Write-Host "   Intentando ejecutar el script de todas formas..." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Prisma no encontrado en node_modules/.bin" -ForegroundColor Yellow
    Write-Host "   Intentando ejecutar el script de todas formas..." -ForegroundColor Yellow
}

# Ejecutar el script de corrección
Write-Host ""
Write-Host "🔍 Ejecutando script de corrección..." -ForegroundColor Yellow
Write-Host ""

node scripts/fixTecnicos.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Proceso completado exitosamente" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error al ejecutar el script" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternativa: Ejecuta el script SQL directamente en tu base de datos" -ForegroundColor Yellow
    Write-Host "   Archivo: scripts/fixTecnicos.sql" -ForegroundColor Gray
    exit 1
}

