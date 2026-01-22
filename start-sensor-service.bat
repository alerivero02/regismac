@echo off
REM Servicio Python para leer datos del ESP32 y enviarlos a producción
REM Este script inicia el servicio automáticamente

echo ========================================
echo ESP32 Sensor Service - Iniciando...
echo ========================================
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

REM Verificar que Python esté instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no encontrado. Por favor instala Python 3.8 o superior.
    pause
    exit /b 1
)

REM Verificar que las dependencias estén instaladas
echo Verificando dependencias...
python -c "import flask, serial, requests" >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias...
    pip install -r requirements-esp32-service.txt
    if errorlevel 1 (
        echo ERROR: No se pudieron instalar las dependencias.
        pause
        exit /b 1
    )
)

REM Configurar variables de entorno
set BACKEND_URL=https://regismac.onrender.com
set SEND_TO_BACKEND=true

REM Configurar puerto serial automático (opcional, descomenta y ajusta si quieres conexión automática)
REM set SERIAL_PORT=COM4
REM set SERIAL_BAUD=115200

echo.
echo Configuración:
echo   Backend URL: %BACKEND_URL%
echo   Enviar a backend: %SEND_TO_BACKEND%
echo.
echo Iniciando servicio...
echo.

REM Iniciar el servicio
python esp32-serial-service.py

REM Si el servicio se cierra, esperar antes de salir
if errorlevel 1 (
    echo.
    echo El servicio se cerró con un error.
    pause
)
