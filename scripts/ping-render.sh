#!/bin/bash
# Script para mantener activo el servicio de Render
# Ejecutar: chmod +x scripts/ping-render.sh && ./scripts/ping-render.sh

URL="${RENDER_URL:-https://tu-servicio.onrender.com/api/health}"
INTERVAL="${PING_INTERVAL:-300}"  # 5 minutos por defecto

echo "🔄 Iniciando ping periódico a Render..."
echo "URL: $URL"
echo "Intervalo: $INTERVAL segundos ($(($INTERVAL / 60)) minutos)"
echo "Presiona Ctrl+C para detener"
echo ""

ping_count=0

while true; do
    ping_count=$((ping_count + 1))
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if response=$(curl -s -w "\n%{http_code}" "$URL" 2>&1); then
        http_code=$(echo "$response" | tail -n1)
        if [ "$http_code" = "200" ]; then
            echo "[$timestamp] ✅ Ping #$ping_count exitoso - Status: $http_code"
        else
            echo "[$timestamp] ⚠️  Ping #$ping_count - Status: $http_code"
        fi
    else
        echo "[$timestamp] ❌ Ping #$ping_count falló"
    fi
    
    echo "   Próximo ping en $(($INTERVAL / 60)) minutos..."
    sleep "$INTERVAL"
done

