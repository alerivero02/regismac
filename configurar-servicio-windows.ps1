# Script para configurar el servicio Python como tarea programada en Windows
# Ejecutar como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configurar Servicio ESP32 Sensor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = $PSScriptRoot
$batFile = Join-Path $scriptPath "start-sensor-service.bat"
$pythonScript = Join-Path $scriptPath "esp32-serial-service.py"

# Verificar que los archivos existan
if (-not (Test-Path $batFile)) {
    Write-Host "ERROR: No se encontró start-sensor-service.bat" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $pythonScript)) {
    Write-Host "ERROR: No se encontró esp32-serial-service.py" -ForegroundColor Red
    exit 1
}

# Verificar que Python esté instalado
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python encontrado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Crear tarea programada
$taskName = "ESP32SensorService"
$taskDescription = "Servicio Python para leer datos del ESP32 y enviarlos a producción"

Write-Host "Creando tarea programada: $taskName" -ForegroundColor Yellow

# Eliminar tarea existente si existe
try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tarea existente eliminada" -ForegroundColor Yellow
} catch {
    # No existe, continuar
}

# Crear acción
$action = New-ScheduledTaskAction -Execute $batFile -WorkingDirectory $scriptPath

# Crear trigger: Al iniciar sesión
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Crear configuración
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# Crear principal (ejecutar como usuario actual)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

# Registrar tarea
try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $taskDescription | Out-Null
    Write-Host "✅ Tarea programada creada exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "La tarea se ejecutará automáticamente al iniciar sesión" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para iniciar manualmente ahora:" -ForegroundColor Yellow
    Write-Host "  Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "Para ver el estado:" -ForegroundColor Yellow
    Write-Host "  Get-ScheduledTask -TaskName '$taskName' | Get-ScheduledTaskInfo" -ForegroundColor White
} catch {
    Write-Host "ERROR al crear la tarea: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Asegúrate de ejecutar este script como Administrador" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuración completada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
