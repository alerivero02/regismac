# Script simple para levantar RegisMAC en local (misma terminal)
# Uso: .\start-local-simple.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RegisMAC - Iniciando Aplicación Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado. Por favor instálalo desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Verificar npm
Write-Host "[2/5] Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm instalado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm no está instalado." -ForegroundColor Red
    exit 1
}

# Verificar archivo .env en backend
Write-Host "[3/5] Verificando configuración del backend..." -ForegroundColor Yellow
$envPath = "regismac-backend\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  Archivo .env no encontrado en regismac-backend/" -ForegroundColor Yellow
    Write-Host "   Por favor crea el archivo .env con las variables necesarias." -ForegroundColor Yellow
}

# Instalar dependencias si es necesario
Write-Host "[4/5] Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "regismac-backend\node_modules")) {
    Write-Host "   Instalando dependencias del backend..." -ForegroundColor Gray
    Set-Location regismac-backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "regismac-frontend\node_modules")) {
    Write-Host "   Instalando dependencias del frontend..." -ForegroundColor Gray
    Set-Location regismac-frontend
    npm install
    Set-Location ..
}

# Generar Prisma Client
if (Test-Path "regismac-backend\node_modules") {
    Write-Host "   Generando Prisma Client..." -ForegroundColor Gray
    Set-Location regismac-backend
    npx prisma generate
    Set-Location ..
}

Write-Host "[5/5] Iniciando servidores..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Servidores iniciados" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener ambos servidores" -ForegroundColor Yellow
Write-Host ""

# Obtener la ruta absoluta del directorio actual
$rootPath = (Get-Location).Path
$backendPath = Join-Path $rootPath "regismac-backend"
$frontendPath = Join-Path $rootPath "regismac-frontend"

# Iniciar backend en nueva ventana
Write-Host "🚀 Iniciando Backend..." -ForegroundColor Cyan
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '🔧 Backend - RegisMAC (Puerto 3000)' -ForegroundColor Cyan; Write-Host ''; npm run dev" -WindowStyle Normal -PassThru

# Esperar un poco para que el backend inicie
Start-Sleep -Seconds 3

# Iniciar frontend en nueva ventana
Write-Host "🚀 Iniciando Frontend..." -ForegroundColor Cyan
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '🎨 Frontend - RegisMAC (Puerto 5173)' -ForegroundColor Cyan; Write-Host ''; npm run dev" -WindowStyle Normal -PassThru

Write-Host ""
Write-Host "✅ Ambos servidores iniciados en ventanas separadas" -ForegroundColor Green
Write-Host ""
Write-Host "Para detener los servidores, cierra las ventanas de PowerShell o presiona Ctrl+C en cada una" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona cualquier tecla para salir (los servidores seguirán ejecutándose)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

