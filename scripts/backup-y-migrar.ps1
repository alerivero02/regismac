# Script para hacer backup de Render y ejecutar migraciones en Railway
# Uso: .\scripts\backup-y-migrar.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backup de Render + Migraciones Railway" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Obtener URL de Render
Write-Host "📋 Paso 1: Configurar URL de Render PostgreSQL" -ForegroundColor Yellow
Write-Host ""
Write-Host "Necesito la External Database URL de Render:" -ForegroundColor White
Write-Host "1. Ve a Render Dashboard → Tu servicio PostgreSQL" -ForegroundColor Gray
Write-Host "2. Ve a 'Connections' o 'Info'" -ForegroundColor Gray
Write-Host "3. Copia la 'External Database URL'" -ForegroundColor Gray
Write-Host ""
$renderUrl = Read-Host "Ingresa la URL de Render PostgreSQL (postgresql://...)"

if ([string]::IsNullOrWhiteSpace($renderUrl)) {
    Write-Host "❌ URL de Render es requerida" -ForegroundColor Red
    exit 1
}

# Paso 2: Hacer backup
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 Paso 2: Creando backup de Render..." -ForegroundColor Yellow
Write-Host ""

# Configurar DATABASE_URL temporalmente
$env:DATABASE_URL = $renderUrl

# Ejecutar script de backup
$backupScript = Join-Path $PSScriptRoot "..\regismac-backend\scripts\backup-database-postgres.js"
if (Test-Path $backupScript) {
    Write-Host "Ejecutando script de backup..." -ForegroundColor Gray
    Push-Location (Join-Path $PSScriptRoot "..\regismac-backend")
    node scripts/backup-database-postgres.js
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al crear backup" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    # Buscar el último backup creado
    $backupDir = Join-Path $PSScriptRoot "..\regismac-backend\backups"
    $latestBackup = Get-ChildItem -Path $backupDir -Filter "regismac_backup_*.sql" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 1
    
    if ($latestBackup) {
        Write-Host ""
        Write-Host "✅ Backup creado exitosamente:" -ForegroundColor Green
        Write-Host "   Archivo: $($latestBackup.Name)" -ForegroundColor Gray
        Write-Host "   Ubicación: $($latestBackup.FullName)" -ForegroundColor Gray
        Write-Host "   Tamaño: $([math]::Round($latestBackup.Length / 1KB, 2)) KB" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "⚠️  No se encontró el archivo de backup" -ForegroundColor Yellow
        Write-Host "   Verifica manualmente en: $backupDir" -ForegroundColor Gray
    }
    
    Pop-Location
} else {
    Write-Host "⚠️  Script de backup no encontrado" -ForegroundColor Yellow
    Write-Host "   Usando pg_dump directamente..." -ForegroundColor Gray
    
    # Verificar si pg_dump está disponible
    try {
        $pgDumpVersion = pg_dump --version 2>&1
        Write-Host "✅ pg_dump encontrado: $pgDumpVersion" -ForegroundColor Green
        
        $backupFile = "backup_render_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
        Write-Host "Creando backup: $backupFile" -ForegroundColor Gray
        
        pg_dump $renderUrl > $backupFile
        
        if (Test-Path $backupFile) {
            Write-Host "✅ Backup creado: $backupFile" -ForegroundColor Green
        } else {
            Write-Host "❌ Error al crear backup" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ pg_dump no está disponible" -ForegroundColor Red
        Write-Host "   Instala PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
        exit 1
    }
}

# Paso 3: Verificar Railway CLI
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 Paso 3: Verificando Railway CLI..." -ForegroundColor Yellow
Write-Host ""

try {
    $railwayVersion = railway --version 2>&1
    Write-Host "✅ Railway CLI encontrado: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI no está instalado" -ForegroundColor Red
    Write-Host "   Instala: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Verificar si está logueado
Write-Host ""
Write-Host "Verificando login en Railway..." -ForegroundColor Gray
$railwayStatus = railway whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No estás logueado en Railway" -ForegroundColor Yellow
    Write-Host "   Ejecuta: railway login" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Después de hacer login, ejecuta este script de nuevo." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Logueado en Railway como: $railwayStatus" -ForegroundColor Green

# Paso 4: Conectar a proyecto
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 Paso 4: Conectando a proyecto Railway..." -ForegroundColor Yellow
Write-Host ""

$linkResult = railway link 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Error al conectar al proyecto" -ForegroundColor Yellow
    Write-Host "   Asegúrate de estar en el directorio correcto" -ForegroundColor Gray
    Write-Host "   O ejecuta manualmente: railway link" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Proyecto conectado" -ForegroundColor Green

# Paso 5: Ejecutar migraciones
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 Paso 5: Ejecutando migraciones en Railway..." -ForegroundColor Yellow
Write-Host ""

$backendDir = Join-Path $PSScriptRoot "..\regismac-backend"
Push-Location $backendDir

Write-Host "Generando Prisma Client..." -ForegroundColor Gray
railway run npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Error al generar Prisma Client" -ForegroundColor Yellow
    Write-Host "   Continuando con migraciones..." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Ejecutando migraciones..." -ForegroundColor Gray
railway run npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migraciones ejecutadas exitosamente" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error al ejecutar migraciones" -ForegroundColor Red
    Write-Host "   Revisa los logs arriba para más detalles" -ForegroundColor Gray
    Pop-Location
    exit 1
}

Pop-Location

# Resumen final
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Proceso completado" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resumen:" -ForegroundColor Yellow
Write-Host "✅ Backup de Render creado" -ForegroundColor Green
Write-Host "✅ Migraciones ejecutadas en Railway" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Verifica los logs de Railway para confirmar que todo funciona" -ForegroundColor White
Write-Host "2. Prueba tu aplicación en Railway" -ForegroundColor White
Write-Host "3. Verifica que los datos estén correctos" -ForegroundColor White
Write-Host ""
