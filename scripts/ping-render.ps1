# Script para mantener activo el servicio de Render
# Ejecutar: .\scripts\ping-render.ps1
# O configurar como tarea programada en Windows

param(
    [string]$Url = "https://tu-servicio.onrender.com/api/health",
    [int]$Interval = 300  # 5 minutos en segundos
)

Write-Host "🔄 Iniciando ping periódico a Render..." -ForegroundColor Cyan
Write-Host "URL: $Url" -ForegroundColor Yellow
Write-Host "Intervalo: $Interval segundos ($($Interval/60) minutos)" -ForegroundColor Yellow
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Gray
Write-Host ""

$pingCount = 0

while ($true) {
    $pingCount++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 10
        $status = $response.StatusCode
        
        if ($status -eq 200) {
            Write-Host "[$timestamp] ✅ Ping #$pingCount exitoso - Status: $status" -ForegroundColor Green
        } else {
            Write-Host "[$timestamp] ⚠️  Ping #$pingCount - Status: $status" -ForegroundColor Yellow
        }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "[$timestamp] ❌ Ping #$pingCount falló: $errorMsg" -ForegroundColor Red
    }
    
    Write-Host "   Próximo ping en $($Interval/60) minutos..." -ForegroundColor Gray
    Start-Sleep -Seconds $Interval
}

