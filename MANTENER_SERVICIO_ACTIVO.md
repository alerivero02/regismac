# 🔄 Mantener Servicio Activo en Render (Plan Gratuito)

En el plan gratuito de Render, los servicios se "duermen" después de 15 minutos de inactividad. Esto causa demoras de 30-60 segundos cuando alguien intenta acceder.

## ✅ Solución: Servicio de Ping Periódico

Para mantener tu servicio siempre activo, configura un servicio externo que haga pings periódicos a tu endpoint de health check.

---

## 🎯 Opción 1: UptimeRobot (Recomendado - Gratis)

**UptimeRobot** es un servicio gratuito que puede hacer pings cada 5 minutos.

### Pasos:

1. **Crear cuenta en UptimeRobot**
   - Ve a: https://uptimerobot.com/
   - Crea una cuenta gratuita (hasta 50 monitores)

2. **Agregar nuevo monitor**
   - Click en "Add New Monitor"
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: RegisMAC Keep Alive
   - **URL**: `https://tu-servicio.onrender.com/api/health`
   - **Monitoring Interval**: 5 minutes (mínimo en plan gratuito)
   - Click en "Create Monitor"

3. **Listo!** 
   - UptimeRobot hará pings cada 5 minutos
   - Tu servicio permanecerá activo

---

## 🎯 Opción 2: cron-job.org (Gratis)

**cron-job.org** permite configurar pings cada 1-5 minutos.

### Pasos:

1. **Crear cuenta**
   - Ve a: https://cron-job.org/
   - Crea una cuenta gratuita

2. **Crear nuevo cron job**
   - Click en "Create cronjob"
   - **Title**: RegisMAC Keep Alive
   - **Address**: `https://tu-servicio.onrender.com/api/health`
   - **Schedule**: Cada 5 minutos (`*/5 * * * *`)
   - **Request Method**: GET
   - Click en "Create cronjob"

---

## 🎯 Opción 3: EasyCron (Gratis)

**EasyCron** ofrece un plan gratuito con pings cada hora (puedes pagar para más frecuencia).

### Pasos:

1. **Crear cuenta**
   - Ve a: https://www.easycron.com/
   - Crea una cuenta gratuita

2. **Crear cron job**
   - Click en "Add Cron Job"
   - **URL**: `https://tu-servicio.onrender.com/api/health`
   - **Schedule**: Cada 5 minutos
   - Guardar

---

## 🎯 Opción 4: Script Local (Opcional)

Si tienes una computadora que siempre está encendida, puedes ejecutar este script localmente:

### Windows (PowerShell):

Crea un archivo `ping-render.ps1`:

```powershell
# Ping a Render cada 5 minutos
$url = "https://tu-servicio.onrender.com/api/health"

while ($true) {
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing
        Write-Host "$(Get-Date): Ping exitoso - Status: $($response.StatusCode)"
    } catch {
        Write-Host "$(Get-Date): Error en ping: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 300  # 5 minutos
}
```

Ejecutar:
```powershell
.\ping-render.ps1
```

### Linux/Mac:

Crea un archivo `ping-render.sh`:

```bash
#!/bin/bash
URL="https://tu-servicio.onrender.com/api/health"

while true; do
    curl -s "$URL" > /dev/null
    echo "$(date): Ping enviado"
    sleep 300  # 5 minutos
done
```

Ejecutar:
```bash
chmod +x ping-render.sh
./ping-render.sh
```

---

## 📊 Frecuencia Recomendada

- **Mínimo**: Cada 10 minutos (Render duerme después de 15 min)
- **Recomendado**: Cada 5 minutos (más seguro)
- **Óptimo**: Cada 1-2 minutos (si el servicio lo permite)

---

## ⚠️ Nota Importante

- El plan gratuito de Render tiene límites de uso
- Si haces demasiados pings, podrías alcanzar los límites
- 5 minutos es un buen balance entre mantener activo y no exceder límites

---

## 🔍 Verificar que Funciona

1. Espera 15 minutos sin usar tu servicio
2. Haz una petición a tu servicio
3. Si responde inmediatamente (sin demora), el ping está funcionando
4. Si hay demora de 30-60 segundos, el servicio se durmió

---

## 💡 Alternativa: Plan de Pago

Si necesitas garantía 100% de disponibilidad, considera actualizar al plan de pago de Render ($7/mes), que mantiene los servicios siempre activos.

---

## 📝 Endpoints Disponibles

Tu aplicación tiene estos endpoints para ping:

- `https://tu-servicio.onrender.com/api/health` (recomendado)
- `https://tu-servicio.onrender.com/` (también funciona)

Ambos responden con un JSON indicando que el servicio está activo.

