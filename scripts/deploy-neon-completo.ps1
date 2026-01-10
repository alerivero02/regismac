# Script completo para deployment en Vercel con Neon
# Ejecutar desde la raíz del proyecto: .\scripts\deploy-neon-completo.ps1

Write-Host "🚀 Deployment Completo: Vercel + Neon Database" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script te guiará paso a paso para desplegar tu aplicación" -ForegroundColor Gray
Write-Host ""

# Verificar que estamos en la raíz del proyecto
if (-not (Test-Path "regismac-backend") -or -not (Test-Path "regismac-frontend")) {
    Write-Host "❌ Error: Ejecuta este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Connection string de Neon
$DATABASE_URL = "postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "PASO 1: Migraciones de Base de Datos" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

$env:DATABASE_URL = $DATABASE_URL
Set-Location regismac-backend

Write-Host "1.1 Generando cliente de Prisma..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al generar cliente de Prisma" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✅ Cliente generado" -ForegroundColor Green
Write-Host ""

Write-Host "1.2 Aplicando migraciones a Neon..." -ForegroundColor Yellow
# Intentar con migrate deploy primero
npx prisma migrate deploy 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No hay migraciones. Usando db push..." -ForegroundColor Yellow
    npx prisma db push --accept-data-loss
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al crear tablas" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
Write-Host "✅ Base de datos lista" -ForegroundColor Green
Write-Host ""

Set-Location ..

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "PASO 2: Crear Usuario Administrador" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

Write-Host "¿Deseas crear un usuario administrador ahora? (s/n):" -ForegroundColor Yellow
$createAdmin = Read-Host

if ($createAdmin -eq "s" -or $createAdmin -eq "S") {
    Write-Host ""
    Write-Host "Email (Enter para admin@regismac.com):" -ForegroundColor Yellow
    $adminEmail = Read-Host
    if ([string]::IsNullOrWhiteSpace($adminEmail)) {
        $adminEmail = "admin@regismac.com"
    }
    
    Write-Host "Contraseña (Enter para Admin123!):" -ForegroundColor Yellow
    $adminPass = Read-Host -AsSecureString
    $adminPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPass))
    if ([string]::IsNullOrWhiteSpace($adminPassPlain)) {
        $adminPassPlain = "Admin123!"
    }
    
    Write-Host ""
    Write-Host "Creando administrador..." -ForegroundColor Gray
    Set-Location regismac-backend
    node scripts/createAdmin.js "$adminEmail" "$adminPassPlain" "Administrador"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Admin creado: $adminEmail / $adminPassPlain" -ForegroundColor Green
    }
    
    Set-Location ..
}
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "PASO 3: Variables de Entorno en Vercel" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

Write-Host "¿Ya configuraste las variables de entorno en Vercel? (s/n):" -ForegroundColor Yellow
$envConfigured = Read-Host

if ($envConfigured -ne "s" -and $envConfigured -ne "S") {
    Write-Host ""
    Write-Host "📋 Debes configurar estas variables en Vercel:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   DATABASE_URL=$DATABASE_URL" -ForegroundColor Gray
    Write-Host "   BACKEND_URL=https://tu-proyecto.vercel.app" -ForegroundColor Gray
    Write-Host "   FRONTEND_URL=https://tu-proyecto.vercel.app" -ForegroundColor Gray
    Write-Host "   NODE_ENV=production" -ForegroundColor Gray
    Write-Host "   SESSION_SECRET=<genera uno con: node -e 'console.log(require(\"crypto\").randomBytes(64).toString(\"hex\"))'>" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔗 Ve a: https://vercel.com/dashboard → Tu Proyecto → Settings → Environment Variables" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Presiona Enter cuando hayas terminado..." -ForegroundColor Yellow
    Read-Host
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "PASO 4: Commit y Push" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

Write-Host "¿Deseas hacer commit y push de los cambios? (s/n):" -ForegroundColor Yellow
$doPush = Read-Host

if ($doPush -eq "s" -or $doPush -eq "S") {
    Write-Host ""
    Write-Host "4.1 Agregando archivos..." -ForegroundColor Yellow
    git add .
    
    Write-Host "4.2 Creando commit..." -ForegroundColor Yellow
    git commit -m "Fix: Configurar API handler para producción con Neon DB"
    
    Write-Host "4.3 Pusheando a GitHub..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Código pusheado correctamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Vercel está desplegando tu aplicación..." -ForegroundColor Cyan
        Write-Host "   Ve a: https://vercel.com/dashboard para ver el progreso" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error al pushear" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "✅ DEPLOYMENT COMPLETO" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Espera a que Vercel termine el deployment (2-5 min)" -ForegroundColor White
Write-Host "2. Accede a tu aplicación: https://tu-proyecto.vercel.app" -ForegroundColor White
Write-Host "3. Inicia sesión con tu usuario administrador" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   vercel logs --prod --follow  (ver logs en tiempo real)" -ForegroundColor Gray
Write-Host "   vercel env ls                (listar variables de entorno)" -ForegroundColor Gray
Write-Host "   vercel --prod --force        (redeploy forzado)" -ForegroundColor Gray
Write-Host ""

Write-Host "📖 Documentación completa: DEPLOY_NEON.md" -ForegroundColor Yellow
Write-Host ""
