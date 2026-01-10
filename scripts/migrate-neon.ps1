# Script para ejecutar migraciones en Neon Database
# Ejecutar desde la raíz del proyecto: .\scripts\migrate-neon.ps1

Write-Host "🗄️  Migraciones para Neon Database (PostgreSQL)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Connection string de Neon
$DATABASE_URL = "postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

Write-Host "📋 Base de datos: Neon PostgreSQL" -ForegroundColor Green
Write-Host "🔗 Host: ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech" -ForegroundColor Gray
Write-Host ""

# Configurar variable de entorno
$env:DATABASE_URL = $DATABASE_URL

# Ir al directorio del backend
Set-Location regismac-backend

Write-Host "1️⃣  Generando cliente de Prisma..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al generar cliente de Prisma" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Cliente de Prisma generado" -ForegroundColor Green
Write-Host ""

Write-Host "2️⃣  Verificando conexión a base de datos..." -ForegroundColor Yellow
$connectionTest = npx prisma db execute --stdin --file nul 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Conexión exitosa a Neon" -ForegroundColor Green
} else {
    Write-Host "⚠️  No se pudo verificar la conexión, pero continuando..." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "3️⃣  Aplicando migraciones..." -ForegroundColor Yellow
Write-Host ""
Write-Host "¿Deseas aplicar las migraciones existentes (migrate deploy) o crear las tablas directamente (db push)?" -ForegroundColor Cyan
Write-Host "[1] migrate deploy (recomendado si tienes migraciones)" -ForegroundColor White
Write-Host "[2] db push (crear/actualizar tablas directamente)" -ForegroundColor White
$option = Read-Host "Opción (1 o 2)"

if ($option -eq "1") {
    Write-Host ""
    Write-Host "Ejecutando: npx prisma migrate deploy" -ForegroundColor Gray
    npx prisma migrate deploy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al aplicar migraciones" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Si no tienes migraciones creadas, usa la opción 2 (db push)" -ForegroundColor Yellow
        Set-Location ..
        exit 1
    }
} elseif ($option -eq "2") {
    Write-Host ""
    Write-Host "Ejecutando: npx prisma db push" -ForegroundColor Gray
    npx prisma db push --accept-data-loss
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al crear tablas" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
} else {
    Write-Host "❌ Opción inválida" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-Host "✅ Base de datos configurada correctamente!" -ForegroundColor Green
Write-Host ""

# Preguntar si desea abrir Prisma Studio
Write-Host "¿Deseas abrir Prisma Studio para ver las tablas? (s/n):" -ForegroundColor Yellow
$openStudio = Read-Host

if ($openStudio -eq "s" -or $openStudio -eq "S") {
    Write-Host ""
    Write-Host "🔧 Abriendo Prisma Studio..." -ForegroundColor Cyan
    Write-Host "Presiona Ctrl+C para cerrar cuando termines" -ForegroundColor Gray
    npx prisma studio
}

# Volver al directorio raíz
Set-Location ..

Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Crear usuario admin: cd regismac-backend && node scripts/createAdmin.js" -ForegroundColor White
Write-Host "2. Configurar variables en Vercel: .\scripts\setup-vercel-env.ps1" -ForegroundColor White
Write-Host "3. Deploy: git add . && git commit -m 'Deploy' && git push" -ForegroundColor White
Write-Host ""
