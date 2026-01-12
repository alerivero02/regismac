# 🧪 Guía para Probar ESP32 en Local - RegisMAC

## 📋 Requisitos Previos

1. ✅ Servidor backend corriendo en `http://localhost:3000`
2. ✅ Frontend corriendo en `http://localhost:5173` (o la IP local)
3. ✅ ESP32 conectado a la misma red WiFi que tu computadora
4. ✅ Sensor DHT11 o DHT22 conectado al ESP32

## 🔧 Configuración Paso a Paso

### Paso 1: Obtener tu IP Local

**Windows:**
```powershell
ipconfig
```
Busca la línea **"IPv4 Address"** de tu adaptador de red activo (ej: `192.168.1.100`)

**Ejemplo de salida:**
```
Adaptador de Ethernet Ethernet:
   IPv4. . . . . . . . . . . . . . . . . . . . . : 192.168.1.100
```

### Paso 2: Configurar el ESP32

1. Abre el archivo `ESP32_RegisMAC.ino` en Arduino IDE
2. Modifica estas líneas:

```cpp
// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";           // ← Cambia esto
const char* password = "TU_WIFI_PASSWORD";   // ← Cambia esto

// ⭐ CONFIGURA AQUÍ EL SERVER_URL ⭐
const char* SERVER_URL = "http://192.168.1.100:3000/api/sensor/datos";
//                                 ↑
//                    Reemplaza con TU IP local
```

3. Ajusta el pin del sensor si es necesario:
```cpp
#define DHTPIN 4        // Pin donde está conectado el DHT
#define DHTTYPE DHT22   // DHT11 o DHT22
```

### Paso 3: Verificar que el Servidor Esté Corriendo

Abre una terminal y ejecuta:

```powershell
# En la carpeta regismac-backend
cd regismac-backend
npm run dev
```

Deberías ver:
```
🚀 Server avviato su http://localhost:3000
🌐 Accessibile dalla rete locale: http://TU_IP:3000
```

### Paso 4: Verificar el Firewall

Asegúrate de que Windows Firewall permita conexiones en el puerto 3000:

1. Ve a **Configuración de Windows** → **Firewall de Windows**
2. **Permitir una aplicación a través del firewall**
3. Busca **Node.js** y marca **Privada** y **Pública**
4. O crea una regla para el puerto 3000

### Paso 5: Cargar el Código al ESP32

1. Conecta el ESP32 a tu computadora por USB
2. En Arduino IDE:
   - Selecciona la placa: **ESP32 Dev Module** (o tu modelo)
   - Selecciona el puerto COM correcto
   - Haz clic en **Subir** (Upload)

### Paso 6: Abrir el Monitor Serial

1. En Arduino IDE, ve a **Herramientas** → **Monitor Serie**
2. Configura la velocidad a **115200 baudios**
3. Deberías ver:

```
=== Iniciando ESP32 ===
✅ Sensor DHT inicializado
Conectando a WiFi...
✅ WiFi conectado!
IP asignada: 192.168.1.50
Server URL: http://192.168.1.100:3000/api/sensor/datos

📊 Temperatura: 25.3°C | Humedad: 60.1%
✅ Datos enviados. Código de respuesta: 200
```

### Paso 7: Verificar en el Frontend

1. Abre tu navegador en `http://localhost:5173` o `http://TU_IP:5173`
2. Inicia sesión
3. Ve a la página de **Tests**
4. Haz clic en el botón **"ESP32"** (verde, en la sección "Informazioni Test")
5. Deberías ver:
   - Temperatura actual del sensor
   - Humedad actual del sensor
   - Última actualización

## ✅ Checklist de Verificación

- [ ] Servidor backend corriendo en puerto 3000
- [ ] Frontend corriendo y accesible
- [ ] ESP32 conectado a WiFi
- [ ] SERVER_URL configurado con la IP correcta
- [ ] Firewall permite conexiones en puerto 3000
- [ ] Monitor Serial muestra "✅ Datos enviados. Código de respuesta: 200"
- [ ] Modal ESP32 muestra datos actualizándose

## 🐛 Solución de Problemas Comunes

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

## 🎯 Próximos Pasos

Una vez que todo funcione en local:
1. Prueba iniciar un test desde el modal ESP32
2. Verifica que los tiempos se detecten automáticamente
3. Verifica que el test se cree automáticamente al finalizar

