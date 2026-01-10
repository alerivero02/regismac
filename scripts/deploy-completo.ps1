# Script de Deployment Completo Automatizado para RegisMAC
# Este script intenta automatizar todo el proceso de deployment

Write-Host "🚀 Deployment Completo de RegisMAC" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "[1/8] Verificando Node.js..." -ForegroundColor Yellow
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js no está instalado. Por favor instálalo desde https://nodejs.org/" -ForegroundColor Red
    exit 1
}
$nodeVersion = node --version
Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green

# Verificar Git
Write-Host "[2/8] Verificando Git..." -ForegroundColor Yellow
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git no está instalado. Por favor instálalo desde https://git-scm.com/" -ForegroundColor Red
    exit 1
}
$gitVersion = git --version
Write-Host "✅ Git instalado: $gitVersion" -ForegroundColor Green

# Generar secrets
Write-Host "[3/8] Generando secrets seguros..." -ForegroundColor Yellow
$secrets = node scripts/generate-secrets.js
Write-Host "✅ Secrets generados" -ForegroundColor Green
Write-Host ""

# Preparar Git
Write-Host "[4/8] Preparando repositorio Git..." -ForegroundColor Yellow
if (!(Test-Path ".git")) {
    git init
    Write-Host "✅ Git inicializado" -ForegroundColor Green
} else {
    Write-Host "✅ Git ya está inicializado" -ForegroundColor Green
}

# Hacer commit
Write-Host "[5/8] Haciendo commit de cambios..." -ForegroundColor Yellow
git add .
$hasChanges = git status --porcelain
if ($hasChanges) {
    git commit -m "feat: RegisMAC ready for deployment - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host "✅ Cambios commiteados" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No hay cambios para commitear" -ForegroundColor Gray
}

# Verificar remote
Write-Host "[6/8] Verificando remote de GitHub..." -ForegroundColor Yellow
$remotes = git remote
if (!($remotes -contains "origin")) {
    Write-Host ""
    Write-Host "⚠️  No hay remote configurado." -ForegroundColor Yellow
    Write-Host "Para continuar, necesitas:" -ForegroundColor Cyan
    Write-Host "1. Crear un repositorio en GitHub (https://github.com/new)" -ForegroundColor White
    Write-Host "2. Ejecutar: git remote add origin https://github.com/TU_USUARIO/TU_REPO.git" -ForegroundColor White
    Write-Host "3. Ejecutar: git push -u origin main" -ForegroundColor White
    Write-Host ""
    $repoUrl = Read-Host "O ingresa la URL del repositorio ahora (deja vacío para saltar)"
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "✅ Remote agregado" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Remote configurado" -ForegroundColor Green
}

# Resumen de próximos pasos
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📋 PRÓXIMOS PASOS MANUALES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. BASE DE DATOS (Neon - Gratis):" -ForegroundColor Yellow
Write-Host "   a) Ve a https://console.neon.tech/signup" -ForegroundColor White
Write-Host "   b) Crea cuenta con GitHub (más rápido)" -ForegroundColor White
Write-Host "   c) Crea un proyecto llamado 'regismac'" -ForegroundColor White
Write-Host "   d) Copia el connection string (formato: postgresql://...)" -ForegroundColor White
Write-Host ""
Write-Host "2. GITHUB (si no lo hiciste):" -ForegroundColor Yellow
Write-Host "   a) Ve a https://github.com/new" -ForegroundColor White
Write-Host "   b) Crea repositorio 'regismac'" -ForegroundColor White
Write-Host "   c) Ejecuta: git remote add origin https://github.com/TU_USUARIO/regismac.git" -ForegroundColor White
Write-Host "   d) Ejecuta: git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "3. VERCEL (Gratis):" -ForegroundColor Yellow
Write-Host "   a) Ve a https://vercel.com y crea cuenta con GitHub" -ForegroundColor White
Write-Host "   b) Click en 'Add New Project'" -ForegroundColor White
Write-Host "   c) Selecciona tu repositorio 'regismac'" -ForegroundColor White
Write-Host "   d) DEJA TODO VACÍO (vercel.json maneja todo)" -ForegroundColor White
Write-Host "   e) Click en 'Deploy'" -ForegroundColor White
Write-Host ""
Write-Host "4. VARIABLES DE ENTORNO en Vercel:" -ForegroundColor Yellow
Write-Host "   Ve a Settings → Environment Variables y agrega:" -ForegroundColor White
Write-Host ""
$secrets
Write-Host ""
Write-Host "   DATABASE_URL=tu_connection_string_de_neon" -ForegroundColor White
Write-Host "   NODE_ENV=production" -ForegroundColor White
Write-Host "   FRONTEND_URL=https://tu-proyecto.vercel.app (después del primer deploy)" -ForegroundColor White
Write-Host "   BACKEND_URL=https://tu-proyecto.vercel.app (después del primer deploy)" -ForegroundColor White
Write-Host ""
Write-Host "5. MIGRACIONES:" -ForegroundColor Yellow
Write-Host "   cd regismac-backend" -ForegroundColor White
Write-Host "   echo 'DATABASE_URL=tu_connection_string' > .env.production" -ForegroundColor White
Write-Host "   npx prisma migrate deploy" -ForegroundColor White
Write-Host ""
Write-Host "6. REDEPLOY en Vercel:" -ForegroundColor Yellow
Write-Host "   - Haz redeploy después de configurar variables" -ForegroundColor White
Write-Host "   - Actualiza FRONTEND_URL y BACKEND_URL con la URL real" -ForegroundColor White
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📚 Documentación completa:" -ForegroundColor Cyan
Write-Host "   - QUICK_START_DEPLOYMENT.md" -ForegroundColor White
Write-Host "   - DEPLOYMENT_COMPLETO.md" -ForegroundColor White
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
