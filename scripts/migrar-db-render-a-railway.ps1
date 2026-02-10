# Script para migrar base de datos de Render a Railway
# Uso: .\scripts\migrar-db-render-a-railway.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Migración de Base de Datos" -ForegroundColor Cyan
Write-Host "  Render → Railway" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Obtener URL de Render
Write-Host "📋 Paso 1: Configurar URL de Render PostgreSQL" -ForegroundColor Yellow
Write-Host ""
$renderUrl = Read-Host "Ingresa la External Database URL de Render (postgresql://...)"

if ([string]::IsNullOrWhiteSpace($renderUrl)) {
    Write-Host "❌ URL de Render es requerida" -ForegroundColor Red
    exit 1
}

# Paso 2: Hacer backup
Write-Host ""
Write-Host "📋 Paso 2: Creando backup de Render..." -ForegroundColor Yellow
Write-Host ""

# Configurar DATABASE_URL temporalmente
$env:DATABASE_URL = $renderUrl

# Ejecutar script de backup
$backupScript = Join-Path $PSScriptRoot "..\regismac-backend\scripts\backup-database-postgres.js"
if (Test-Path $backupScript) {
    Write-Host "Ejecutando script de backup..." -ForegroundColor Gray
    node $backupScript
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al crear backup" -ForegroundColor Red
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
        Write-Host ""
    } else {
        Write-Host "⚠️  No se encontró el archivo de backup" -ForegroundColor Yellow
        Write-Host "   Verifica manualmente en: $backupDir" -ForegroundColor Gray
    }
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

# Paso 3: Obtener URL de Railway
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 Paso 3: Configurar Railway PostgreSQL" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE: Debes crear PostgreSQL en Railway primero:" -ForegroundColor Yellow
Write-Host "1. Ve a Railway Dashboard" -ForegroundColor White
Write-Host "2. Click 'New' → 'Database' → 'Add PostgreSQL'" -ForegroundColor White
Write-Host "3. Espera a que esté activo (Status: Active)" -ForegroundColor White
Write-Host "4. Copia la DATABASE_URL de Railway" -ForegroundColor White
Write-Host ""
$railwayUrl = Read-Host "Ingresa la DATABASE_URL de Railway (postgresql://...)"

if ([string]::IsNullOrWhiteSpace($railwayUrl)) {
    Write-Host "❌ URL de Railway es requerida" -ForegroundColor Red
    exit 1
}

# Paso 4: Restaurar en Railway
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 Paso 4: Restaurar backup en Railway" -ForegroundColor Yellow
Write-Host ""

# Buscar el archivo de backup
if (-not $latestBackup) {
    $backupDir = Join-Path $PSScriptRoot "..\regismac-backend\backups"
    $latestBackup = Get-ChildItem -Path $backupDir -Filter "regismac_backup_*.sql" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 1
    
    if (-not $latestBackup) {
        $backupFile = Read-Host "No se encontró backup automático. Ingresa la ruta del archivo de backup"
        if (-not (Test-Path $backupFile)) {
            Write-Host "❌ Archivo de backup no encontrado" -ForegroundColor Red
            exit 1
        }
        $latestBackup = Get-Item $backupFile
    }
}

Write-Host "⚠️  ADVERTENCIA: Esto sobrescribirá todos los datos en Railway PostgreSQL!" -ForegroundColor Yellow
Write-Host "   Archivo: $($latestBackup.Name)" -ForegroundColor Gray
Write-Host "   Destino: Railway PostgreSQL" -ForegroundColor Gray
Write-Host ""
$confirm = Read-Host "¿Estás seguro? (escribe 'SI' para confirmar)"

if ($confirm -ne "SI") {
    Write-Host "❌ Restauración cancelada" -ForegroundColor Red
    exit 0
}

# Verificar si psql está disponible
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "✅ psql encontrado: $psqlVersion" -ForegroundColor Green
    Write-Host ""
    Write-Host "Restaurando backup..." -ForegroundColor Gray
    
    # Extraer password de la URL si es necesario
    if ($railwayUrl -match "postgresql://([^:]+):([^@]+)@") {
        $password = $Matches[2]
        $env:PGPASSWORD = $password
    }
    
    # Restaurar usando psql
    Get-Content $latestBackup.FullName | psql $railwayUrl
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Backup restaurado exitosamente en Railway" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Error al restaurar backup" -ForegroundColor Red
        Write-Host "   Código de salida: $LASTEXITCODE" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "❌ psql no está disponible" -ForegroundColor Red
    Write-Host "   Instala PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "O usa Railway CLI:" -ForegroundColor Yellow
    Write-Host "   railway run psql `$DATABASE_URL < $($latestBackup.FullName)" -ForegroundColor Gray
    exit 1
}

# Paso 5: Ejecutar migraciones
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 Paso 5: Ejecutar migraciones de Prisma" -ForegroundColor Yellow
Write-Host ""

$runMigrations = Read-Host "¿Ejecutar migraciones ahora? (S/N)"

if ($runMigrations -eq "S" -or $runMigrations -eq "s") {
    Write-Host "Ejecutando migraciones..." -ForegroundColor Gray
    
    # Verificar si Railway CLI está instalado
    try {
        railway --version | Out-Null
        Write-Host "✅ Railway CLI encontrado" -ForegroundColor Green
        
        $backendDir = Join-Path $PSScriptRoot "..\regismac-backend"
        Push-Location $backendDir
        
        railway run npx prisma migrate deploy
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Migraciones ejecutadas exitosamente" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "⚠️  Error al ejecutar migraciones" -ForegroundColor Yellow
            Write-Host "   Ejecuta manualmente: railway run npx prisma migrate deploy" -ForegroundColor Gray
        }
        
        Pop-Location
    } catch {
        Write-Host "⚠️  Railway CLI no está instalado" -ForegroundColor Yellow
        Write-Host "   Instala: npm install -g @railway/cli" -ForegroundColor Gray
        Write-Host "   O ejecuta manualmente en Railway Dashboard" -ForegroundColor Gray
    }
} else {
    Write-Host "⏭️  Saltando migraciones" -ForegroundColor Gray
    Write-Host "   Ejecuta manualmente: railway run npx prisma migrate deploy" -ForegroundColor Gray
}

# Resumen final
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Migración completada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Verifica que DATABASE_URL en Railway apunte a Railway (no Render)" -ForegroundColor White
Write-Host "2. Verifica los datos en Railway PostgreSQL" -ForegroundColor White
Write-Host "3. Prueba tu aplicación en Railway" -ForegroundColor White
Write-Host "4. Solo después de verificar todo, puedes eliminar Render" -ForegroundColor White
Write-Host ""
Write-Host "Para verificar datos:" -ForegroundColor Yellow
Write-Host "   psql `"$railwayUrl`"" -ForegroundColor Gray
Write-Host "   \dt" -ForegroundColor Gray
Write-Host "   SELECT COUNT(*) FROM `"Test`";" -ForegroundColor Gray
Write-Host ""
