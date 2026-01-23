# Verificar Sensor en Producción

## Problema
El sensor no está funcionando en producción. El servicio Python local debe enviar datos al backend en Render.

## Verificación Paso a Paso

### 1. Verificar que el Servicio Python esté Corriendo

**En tu PC local, verifica:**

```powershell
# Verificar si el servicio está corriendo
Get-Process python | Where-Object {$_.Path -like "*esp32*"}

# O verificar el puerto 5000
netstat -ano | findstr :5000
```

**Si no está corriendo, inícialo:**

```powershell
cd c:\Users\utente\Documents\regismac
python esp32-serial-service.py
```

Deberías ver:
```
ESP32 Serial Service - API REST
📡 Backend URL: https://regismac.onrender.com
📤 Enviar a backend: true
🚀 Iniciando servidor en http://localhost:5000
```

### 2. Verificar Configuración del Servicio Python

**Crea o verifica el archivo `.env` en la raíz del proyecto:**

```env
BACKEND_URL=https://regismac.onrender.com
SEND_TO_BACKEND=true
SERIAL_PORT=COM4  # Cambia por tu puerto USB del ESP32
SERIAL_BAUD=115200
```

### 3. Verificar que el ESP32 esté Conectado

1. Conecta el ESP32 por USB a tu PC
2. Verifica que el puerto aparezca en el servicio Python
3. El servicio debería intentar conectar automáticamente si `SERIAL_PORT` está configurado

### 4. Verificar Logs del Backend en Render

**En Render Dashboard:**
1. Ve a tu servicio
2. Abre la pestaña "Logs"
3. Busca mensajes que empiecen con `📡 recibirDatosSensor`

**Deberías ver:**
```
📡 recibirDatosSensor - Request recibido: { body: { temperatura: 25.5, ... } }
✅ recibirDatosSensor - Datos válidos: { temperatura: 25.5, humedad: null }
✅ recibirDatosSensor - Estado actualizado: { temperatura: 25.5, ... }
✅ recibirDatosSensor - Actualización emitida vía WebSocket
✅ recibirDatosSensor - Enviando respuesta: { success: true, ... }
```

**Si NO ves estos logs:**
- El servicio Python no está enviando datos
- Hay un problema de conexión entre tu PC y Render
- El endpoint no está accesible

### 5. Probar el Endpoint Manualmente

**Desde tu PC local, prueba enviar datos:**

```powershell
# Probar el endpoint directamente
$body = @{
    temperatura = 25.5
    humedad = 60
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://regismac.onrender.com/api/sensor/datos" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Si funciona, deberías recibir:**
```json
{
  "success": true,
  "message": "Datos recibidos correctamente",
  "estado": null
}
```

### 6. Verificar Logs del Servicio Python

**En la consola del servicio Python, deberías ver:**

```
[14:30:25.123] 📊 Temperatura recibida: 25.5°C
[14:30:25.125] ✅ Datos enviados al backend: 25.5°C
```

**Si ves errores como:**
```
⚠️  No se pudo conectar al backend (no crítico)
⚠️  Timeout enviando al backend (no crítico)
```

**Posibles causas:**
- El backend en Render no está accesible
- Problema de red/firewall
- El endpoint está bloqueado

### 7. Verificar Estado del Sensor en el Frontend

1. Abre la aplicación en producción: https://regismac.onrender.com
2. Ve a la página de Tests
3. Abre el modal del sensor
4. Verifica que los datos se actualicen en tiempo real

## Soluciones Comunes

### Problema: El servicio Python no envía datos

**Solución:**
1. Verifica que `SEND_TO_BACKEND=true` en el `.env`
2. Verifica que `BACKEND_URL` sea correcto
3. Reinicia el servicio Python

### Problema: El backend no recibe datos

**Solución:**
1. Verifica los logs de Render para ver si hay errores
2. Prueba el endpoint manualmente (paso 5)
3. Verifica que el endpoint `/api/sensor/datos` esté accesible (sin autenticación)

### Problema: CORS bloquea las peticiones

**Solución:**
Ya está corregido - el CORS ahora permite requests sin origin (servicios locales).

### Problema: El ESP32 no se conecta

**Solución:**
1. Verifica que el puerto USB esté correcto en `SERIAL_PORT`
2. Verifica que el ESP32 esté conectado y encendido
3. Verifica que el código Arduino esté cargado correctamente

## Comandos Útiles

### Iniciar el servicio Python:
```powershell
cd c:\Users\utente\Documents\regismac
python esp32-serial-service.py
```

### Ver logs en tiempo real:
```powershell
# En otra terminal, ver los logs del servicio Python
# Los logs aparecen directamente en la consola
```

### Probar conexión al backend:
```powershell
# Test rápido del endpoint
Invoke-WebRequest -Uri "https://regismac.onrender.com/api/sensor/datos" `
    -Method POST `
    -Body '{"temperatura":25.5}' `
    -ContentType "application/json"
```

## Estado Actual

Después de los cambios recientes:
- ✅ CORS configurado para permitir servicios locales
- ✅ Logging detallado en el endpoint `/api/sensor/datos`
- ✅ Manejo de errores mejorado
- ✅ El endpoint es público (sin autenticación requerida)

## Próximos Pasos

1. **Verifica que el servicio Python esté corriendo** en tu PC
2. **Verifica los logs de Render** después de intentar enviar datos
3. **Comparte los logs** si ves algún error específico
