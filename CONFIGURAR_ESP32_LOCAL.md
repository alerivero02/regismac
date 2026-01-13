# 🔧 Configurar ESP32 para Desarrollo Local

## 📋 Información de Conexión

### IP Local del Servidor
Para encontrar tu IP local, ejecuta:
```powershell
ipconfig
```
Busca la línea **"IPv4 Address"** de tu adaptador de red activo.

### URL del Endpoint
```
http://TU_IP_LOCAL:3000/api/sensor/datos
```

**Ejemplo:** Si tu IP es `192.168.1.100`:
```
http://192.168.1.100:3000/api/sensor/datos
```

## 🔧 Configuración del ESP32

### 1. Abre el archivo `ESP32_RegisMAC_Local.ino`

### 2. Configura las siguientes variables:

```cpp
// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";              // ← Cambia esto
const char* password = "TU_WIFI_PASSWORD";       // ← Cambia esto

// ⭐ CONFIGURA AQUÍ EL SERVER_URL PARA LOCAL ⭐
const char* SERVER_URL = "http://TU_IP_LOCAL:3000/api/sensor/datos";
//                                 ↑
//                    Reemplaza con TU IP local (ej: 192.168.1.100)
```

### 3. Ajusta el pin del sensor si es necesario:

```cpp
#define DHTPIN 4        // Pin donde está conectado el DHT
#define DHTTYPE DHT22   // DHT11 o DHT22
```

## ✅ Verificación

### Paso 1: Verificar que el Backend esté corriendo

Abre tu navegador y ve a:
```
http://localhost:3000/api/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...,
  "service": "regismac"
}
```

### Paso 2: Verificar que el Frontend esté corriendo

Abre tu navegador y ve a:
```
http://localhost:5173
```

### Paso 3: Probar el Endpoint del ESP32

Puedes probar el endpoint manualmente con:

**PowerShell:**
```powershell
$data = @{ temperatura = 25.5; humedad = 60.0 } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/sensor/datos" -Method POST -Body $data -ContentType "application/json"
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/sensor/datos \
  -H "Content-Type: application/json" \
  -d '{"temperatura": 25.5, "humedad": 60.0}'
```

### Paso 4: Cargar código al ESP32

1. Conecta el ESP32 a tu computadora por USB
2. En Arduino IDE:
   - Selecciona la placa: **ESP32 Dev Module**
   - Selecciona el puerto COM correcto
   - Haz clic en **Subir** (Upload)

### Paso 5: Abrir Monitor Serial

1. En Arduino IDE, ve a **Herramientas** → **Monitor Serie**
2. Configura la velocidad a **115200 baudios**
3. Deberías ver:

```
=== Iniciando ESP32 ===
✅ Sensor DHT inicializado
Conectando a WiFi...
✅ WiFi conectado!
IP asignada al ESP32: 192.168.1.50
Server URL: http://192.168.1.100:3000/api/sensor/datos

📊 Lectura: T=25.3°C | H=60.1% | ✅ Enviado (HTTP 200)
```

### Paso 6: Verificar en el Frontend

1. Abre `http://localhost:5173` en tu navegador
2. Inicia sesión
3. Ve a la página de **Tests**
4. Haz clic en el botón **"ESP32"** (verde, en la sección "Informazioni Test")
5. Deberías ver:
   - Temperatura actual del sensor
   - Humedad actual del sensor
   - Última actualización

## 🐛 Solución de Problemas

### ❌ "Connection refused" en el Monitor Serial

**Causa:** El servidor no está corriendo o la IP es incorrecta

**Solución:**
1. Verifica que el servidor esté corriendo: `npm run dev` en `regismac-backend`
2. Verifica la IP con `ipconfig`
3. Asegúrate de usar `http://` (no `https://`) en local

### ❌ "Network unreachable"

**Causa:** El ESP32 no está conectado a WiFi o está en otra red

**Solución:**
1. Verifica las credenciales WiFi en el código
2. Asegúrate de que el ESP32 y tu PC estén en la misma red WiFi

### ❌ No se ven datos en el modal ESP32

**Causa:** El endpoint requiere autenticación o hay un error

**Solución:**
1. Asegúrate de estar autenticado en el frontend
2. Verifica la consola del navegador (F12) para ver errores
3. Verifica que el endpoint `/api/sensor/datos` esté funcionando

### ❌ Error 401 en la consola

**Causa:** La sesión expiró

**Solución:**
1. Cierra sesión y vuelve a iniciar sesión
2. El modal ESP32 mostrará un botón para ir al login si es necesario

## 📝 Notas Importantes

- **En local, usa HTTP (no HTTPS)**: `http://TU_IP:3000`
- **En producción, usa HTTPS**: `https://TU-URL/api/sensor/datos`
- El endpoint `/api/sensor/datos` es **público** (no requiere autenticación)
- El endpoint `/api/sensor/estado` **requiere autenticación** (solo para el frontend)
- El ESP32 debe estar en la **misma red WiFi** que tu computadora

## 🎯 Checklist de Verificación

- [ ] Backend corriendo en `http://localhost:3000`
- [ ] Frontend corriendo en `http://localhost:5173`
- [ ] IP local obtenida con `ipconfig`
- [ ] SERVER_URL configurado en el ESP32 con la IP correcta
- [ ] ESP32 conectado a WiFi
- [ ] Monitor Serial muestra "✅ Enviado (HTTP 200)"
- [ ] Modal ESP32 muestra datos actualizándose

