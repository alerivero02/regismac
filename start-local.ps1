# Script para levantar RegisMAC en local
# Uso: .\start-local.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RegisMAC - Iniciando Aplicación Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "[1/6] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado. Por favor instálalo desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Verificar npm
Write-Host "[2/6] Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm instalado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm no está instalado." -ForegroundColor Red
    exit 1
}

# Verificar archivo .env en backend
Write-Host "[3/6] Verificando configuración del backend..." -ForegroundColor Yellow
$envPath = "regismac-backend\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  Archivo .env no encontrado en regismac-backend/" -ForegroundColor Yellow
    Write-Host "   Por favor crea el archivo .env con las variables necesarias." -ForegroundColor Yellow
    Write-Host "   Puedes usar .env.example como referencia si existe." -ForegroundColor Yellow
    $continue = Read-Host "   ¿Deseas continuar de todos modos? (s/n)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
} else {
    Write-Host "✅ Archivo .env encontrado" -ForegroundColor Green
}

# Instalar dependencias del backend
Write-Host "[4/6] Instalando dependencias del backend..." -ForegroundColor Yellow
Set-Location regismac-backend
if (-not (Test-Path "node_modules")) {
    Write-Host "   Instalando dependencias..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar dependencias del backend" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
} else {
    Write-Host "✅ Dependencias del backend ya instaladas" -ForegroundColor Green
}

# Generar Prisma Client
Write-Host "   Generando Prisma Client..." -ForegroundColor Gray
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Advertencia: Error al generar Prisma Client" -ForegroundColor Yellow
}

Set-Location ..

# Instalar dependencias del frontend
Write-Host "[5/6] Instalando dependencias del frontend..." -ForegroundColor Yellow
Set-Location regismac-frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "   Instalando dependencias..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar dependencias del frontend" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
} else {
    Write-Host "✅ Dependencias del frontend ya instaladas" -ForegroundColor Green
}
Set-Location ..

# Iniciar servidores
Write-Host "[6/6] Iniciando servidores..." -ForegroundColor Yellow
Write-Host ""

# Obtener la ruta absoluta del directorio actual
$rootPath = (Get-Location).Path
$backendPath = Join-Path $rootPath "regismac-backend"
$frontendPath = Join-Path $rootPath "regismac-frontend"

Write-Host "🚀 Iniciando Backend (puerto 3000)..." -ForegroundColor Cyan
Write-Host "🚀 Iniciando Frontend (puerto 5173)..." -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Servidores iniciados" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener los servidores" -ForegroundColor Yellow
Write-Host ""

# Crear comandos para las nuevas ventanas
$backendCommand = "cd '$backendPath'; Write-Host '🔧 Backend - RegisMAC' -ForegroundColor Cyan; Write-Host ''; npm run dev"
$frontendCommand = "cd '$frontendPath'; Write-Host '🎨 Frontend - RegisMAC' -ForegroundColor Cyan; Write-Host ''; npm run dev"

# Iniciar backend en nueva ventana
try {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand -WindowStyle Normal
    Write-Host "✅ Backend iniciado en nueva ventana" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al iniciar el backend: $_" -ForegroundColor Red
    exit 1
}

# Esperar un poco para que el backend inicie
Start-Sleep -Seconds 3

# Iniciar frontend en nueva ventana
try {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand -WindowStyle Normal
    Write-Host "✅ Frontend iniciado en nueva ventana" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al iniciar el frontend: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Servidores iniciados en ventanas separadas" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Puedes cerrar esta ventana, los servidores seguirán ejecutándose" -ForegroundColor Yellow
Write-Host ""

