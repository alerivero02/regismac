@echo off
REM Script para configurar la base de datos con XAMPP
echo ========================================
echo   RegisMAC - Configuracion XAMPP
echo ========================================
echo.

REM Solicitar contraseña de MySQL
set /p MYSQL_PASSWORD="Ingresa la contraseña de MySQL root (presiona Enter si no tiene): "

REM Actualizar .env
echo.
echo Actualizando archivo .env...
if "%MYSQL_PASSWORD%"=="" (
    echo DATABASE_URL="mysql://root:@localhost:3306/regismac" > .env.temp
) else (
    echo DATABASE_URL="mysql://root:%MYSQL_PASSWORD%@localhost:3306/regismac" > .env.temp
)

REM Agregar el resto de las variables
echo NODE_ENV=development >> .env.temp
echo PORT=3000 >> .env.temp
echo HOST=0.0.0.0 >> .env.temp
echo SESSION_SECRET=dev-secret-key-change-in-production >> .env.temp
echo FRONTEND_URL=http://localhost:5173 >> .env.temp
echo BACKEND_URL=http://localhost:3000 >> .env.temp
echo ENABLE_RATE_LIMIT=false >> .env.temp

move /Y .env.temp .env >nul
echo [OK] Archivo .env actualizado
echo.

REM Intentar crear la base de datos
echo Creando base de datos 'regismac'...
if "%MYSQL_PASSWORD%"=="" (
    "C:\xampp\mysql\bin\mysql.exe" -uroot -e "CREATE DATABASE IF NOT EXISTS regismac CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    if errorlevel 1 (
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -e "CREATE DATABASE IF NOT EXISTS regismac CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    )
) else (
    "C:\xampp\mysql\bin\mysql.exe" -uroot -p%MYSQL_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS regismac CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    if errorlevel 1 (
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -p%MYSQL_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS regismac CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    )
)

if errorlevel 1 (
    echo [ADVERTENCIA] No se pudo crear la base de datos automaticamente.
    echo.
    echo Por favor creala manualmente:
    echo 1. Abre http://localhost/phpmyadmin
    echo 2. Crea una base de datos llamada 'regismac'
    echo 3. Luego ejecuta: npm run migrate
    echo.
) else (
    echo [OK] Base de datos 'regismac' creada exitosamente
    echo.
    echo Ejecutando migraciones de Prisma...
    call npx prisma migrate dev --name init
    if errorlevel 1 (
        echo [ADVERTENCIA] Error en las migraciones. Intenta manualmente: npm run migrate
    ) else (
        echo [OK] Migraciones completadas
    )
)

echo.
echo ========================================
echo   Configuracion completada
echo ========================================
echo.
pause


