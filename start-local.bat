@echo off
REM Script para levantar RegisMAC en local
REM Uso: start-local.bat

echo ========================================
echo   RegisMAC - Iniciando Aplicacion Local
echo ========================================
echo.

REM Verificar Node.js
echo [1/6] Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no esta instalado. Por favor instalalo desde https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js instalado: %NODE_VERSION%

REM Verificar npm
echo [2/6] Verificando npm...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm no esta instalado.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm instalado: %NPM_VERSION%

REM Verificar archivo .env en backend
echo [3/6] Verificando configuracion del backend...
if not exist "regismac-backend\.env" (
    echo [ADVERTENCIA] Archivo .env no encontrado en regismac-backend/
    echo    Por favor crea el archivo .env con las variables necesarias.
    echo    Puedes usar .env.example como referencia si existe.
    set /p CONTINUE="   Deseas continuar de todos modos? (s/n): "
    if /i not "%CONTINUE%"=="s" (
        exit /b 1
    )
) else (
    echo [OK] Archivo .env encontrado
)

REM Instalar dependencias del backend
echo [4/6] Instalando dependencias del backend...
cd regismac-backend
if not exist "node_modules" (
    echo    Instalando dependencias...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Error al instalar dependencias del backend
        cd ..
        pause
        exit /b 1
    )
) else (
    echo [OK] Dependencias del backend ya instaladas
)

REM Generar Prisma Client
echo    Generando Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [ADVERTENCIA] Error al generar Prisma Client
)

cd ..

REM Instalar dependencias del frontend
echo [5/6] Instalando dependencias del frontend...
cd regismac-frontend
if not exist "node_modules" (
    echo    Instalando dependencias...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Error al instalar dependencias del frontend
        cd ..
        pause
        exit /b 1
    )
) else (
    echo [OK] Dependencias del frontend ya instaladas
)
cd ..

REM Iniciar servidores
echo [6/6] Iniciando servidores...
echo.
echo [INFO] Iniciando Backend (puerto 3000)...
echo [INFO] Iniciando Frontend (puerto 5173)...
echo.
echo ========================================
echo   Servidores iniciados
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Presiona Ctrl+C para detener los servidores
echo.

REM Obtener la ruta del script
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%regismac-backend"
set "FRONTEND_DIR=%SCRIPT_DIR%regismac-frontend"

REM Iniciar backend en nueva ventana
start "RegisMAC Backend" cmd /k "cd /d "%BACKEND_DIR%" && echo [Backend] RegisMAC && echo. && npm run dev"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo iniciar el backend
    pause
    exit /b 1
)

REM Esperar un poco para que el backend inicie
timeout /t 3 /nobreak >nul

REM Iniciar frontend en nueva ventana
start "RegisMAC Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && echo [Frontend] RegisMAC && echo. && npm run dev"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo iniciar el frontend
    pause
    exit /b 1
)

echo [OK] Servidores iniciados en ventanas separadas
echo.
echo [TIP] Puedes cerrar esta ventana, los servidores seguiran ejecutandose
echo.
pause

