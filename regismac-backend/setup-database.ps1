# Script de configuración de base de datos para RegisMAC
# Este script ayuda a configurar el archivo .env y verificar la conexión a MySQL

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RegisMAC - Configuración de Base de Datos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si existe .env
$envPath = Join-Path $PSScriptRoot ".env"
$envExists = Test-Path $envPath

if ($envExists) {
    Write-Host "[INFO] Archivo .env ya existe" -ForegroundColor Yellow
    $overwrite = Read-Host "¿Deseas sobrescribirlo? (s/n)"
    if ($overwrite -ne "s") {
        Write-Host "[INFO] Operación cancelada" -ForegroundColor Yellow
        exit 0
    }
}

# Solicitar información de la base de datos
Write-Host ""
Write-Host "Por favor, proporciona la siguiente información:" -ForegroundColor Green
Write-Host ""

$dbHost = Read-Host "Host de MySQL (por defecto: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }

$dbPort = Read-Host "Puerto de MySQL (por defecto: 3306)"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "3306" }

$dbUser = Read-Host "Usuario de MySQL (por defecto: root)"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "root" }

$dbPassword = Read-Host "Contraseña de MySQL" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

$dbName = Read-Host "Nombre de la base de datos (por defecto: regismac)"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "regismac" }

# Crear DATABASE_URL
$dbUrl = "mysql://${dbUser}:${dbPasswordPlain}@${dbHost}:${dbPort}/${dbName}"

Write-Host ""
Write-Host "Verificando conexión a MySQL..." -ForegroundColor Yellow

# Intentar conectar a MySQL
$mysqlPath = $null
$possiblePaths = @(
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
    "mysql"
)

foreach ($path in $possiblePaths) {
    if ($path -eq "mysql" -or (Test-Path $path)) {
        $mysqlPath = $path
        break
    }
}

if (-not $mysqlPath) {
    Write-Host "[ERROR] No se encontró MySQL. Por favor, instálalo o agrega la ruta al PATH." -ForegroundColor Red
    exit 1
}

# Verificar conexión
$testConnection = & $mysqlPath -h$dbHost -P$dbPort -u$dbUser -p$dbPasswordPlain -e "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] No se pudo conectar a MySQL con las credenciales proporcionadas." -ForegroundColor Red
    Write-Host "Error: $testConnection" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Conexión a MySQL exitosa" -ForegroundColor Green

# Verificar si la base de datos existe
$dbExists = & $mysqlPath -h$dbHost -P$dbPort -u$dbUser -p$dbPasswordPlain -e "SHOW DATABASES LIKE '$dbName';" 2>&1
if ($dbExists -notmatch $dbName) {
    Write-Host ""
    Write-Host "[INFO] La base de datos '$dbName' no existe." -ForegroundColor Yellow
    $createDb = Read-Host "¿Deseas crearla? (s/n)"
    if ($createDb -eq "s") {
        & $mysqlPath -h$dbHost -P$dbPort -u$dbUser -p$dbPasswordPlain -e "CREATE DATABASE IF NOT EXISTS $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Base de datos '$dbName' creada exitosamente" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] No se pudo crear la base de datos" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[INFO] Debes crear la base de datos manualmente antes de continuar" -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] La base de datos '$dbName' existe" -ForegroundColor Green
}

# Crear archivo .env
Write-Host ""
Write-Host "Creando archivo .env..." -ForegroundColor Yellow

$envContent = @"
# Configuración de Base de Datos
DATABASE_URL="$dbUrl"

# Configuración del Servidor
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Seguridad
SESSION_SECRET=dev-secret-key-change-in-production

# Frontend
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Rate Limiting (opcional)
ENABLE_RATE_LIMIT=false

# Google OAuth (opcional - solo si usas autenticación con Google)
# GOOGLE_CLIENT_ID=tu_client_id
# GOOGLE_CLIENT_SECRET=tu_client_secret

# Google Drive (opcional - solo si usas Google Drive)
# GOOGLE_DRIVE_FOLDER_ID=tu_folder_id

# SMTP Email (opcional - solo si usas envío de emails)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=tu_email@gmail.com
# SMTP_PASS=tu_password
"@

$envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
Write-Host "[OK] Archivo .env creado exitosamente" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuración completada" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ejecuta las migraciones de Prisma:" -ForegroundColor White
Write-Host "   cd regismac-backend" -ForegroundColor Gray
Write-Host "   npm run migrate" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Inicia el servidor:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""


