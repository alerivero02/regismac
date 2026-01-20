# 🔧 Configurar ESP32 para Producción (Render)

## 📋 Resumen

En **producción (Render)**, el servidor está en la nube y **NO tiene acceso a puertos USB físicos**. Por lo tanto, debes usar **WiFi/HTTP** para que el ESP32 envíe datos al servidor.

## ✅ Solución: Usar WiFi/HTTP en Producción

El sistema ya está preparado para recibir datos por WiFi/HTTP. Solo necesitas configurar tu ESP32 correctamente.

## 🔧 Configuración del ESP32 para Producción

### 1. Usar el archivo `ESP32_RegisMAC_Produccion.ino`

Este archivo está configurado específicamente para producción.

### 2. Configurar las siguientes variables:

```cpp
// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";              // ← Tu WiFi
const char* password = "TU_WIFI_PASSWORD";       // ← Tu contraseña WiFi

// ⭐ CONFIGURA AQUÍ EL SERVER_URL PARA PRODUCCIÓN ⭐
const char* SERVER_URL = "https://regismac.onrender.com/api/sensor/datos";
//                    ↑
//        Reemplaza con tu URL de Render
```

### 3. Ajustar el sensor según tu hardware:

Si usas **DS18B20** (como en tu código `Lector_temperatura_ESP32.ino`):
```cpp
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
```

Si usas **DHT11/DHT22**:
```cpp
#include <DHT.h>
#define DHTPIN 4
#define DHTTYPE DHT22  // o DHT11
DHT dht(DHTPIN, DHTTYPE);
```

## 📡 Cómo Funciona

1. **ESP32 se conecta a WiFi** (debe tener acceso a Internet)
2. **ESP32 lee el sensor** (DS18B20 o DHT)
3. **ESP32 envía datos por HTTP POST** a `https://tu-url.onrender.com/api/sensor/datos`
4. **El servidor recibe los datos** y los almacena
5. **El frontend muestra los datos** en tiempo real

## 🔄 Comparación: USB vs WiFi

| Característica | USB Serial | WiFi/HTTP |
|---------------|------------|-----------|
| **Desarrollo Local** | ✅ Funciona | ✅ Funciona |
| **Producción (Render)** | ❌ No funciona | ✅ Funciona |
| **Requisitos** | Servidor local | ESP32 con WiFi |
| **Configuración** | Detectar puerto | Configurar URL |

## 🚀 Pasos para Usar en Producción

### Paso 1: Obtener URL de Producción

Tu URL de Render es: `https://regismac.onrender.com` (o la que tengas configurada)

### Paso 2: Configurar ESP32

1. Abre `ESP32_RegisMAC_Produccion.ino` en Arduino IDE
2. Configura:
   - `ssid`: Tu WiFi
   - `password`: Contraseña WiFi
   - `SERVER_URL`: `https://regismac.onrender.com/api/sensor/datos`
3. Ajusta el pin del sensor si es necesario
4. Sube el código al ESP32

### Paso 3: Verificar Conexión

1. Abre el Monitor Serial del Arduino IDE
2. Deberías ver:
   ```
   ✅ WiFi conectado!
   📍 IP asignada al ESP32: 192.168.x.x
   🌐 Server URL: https://regismac.onrender.com/api/sensor/datos
   🚀 Iniciando envío de datos...
   ✅ Enviado (HTTP 200)
   ```

### Paso 4: Usar en la App

1. Abre la aplicación en producción
2. Ve a la página de Tests
3. Haz clic en el botón "ESP32"
4. Los datos deberían aparecer automáticamente

## ⚠️ Requisitos Importantes

1. **ESP32 debe tener acceso a Internet**
   - Debe estar conectado a una red WiFi con Internet
   - No puede estar en una red aislada

2. **URL debe ser HTTPS en producción**
   - Render usa HTTPS por defecto
   - Asegúrate de usar `https://` no `http://`

3. **Firewall/Red**
   - El ESP32 debe poder hacer conexiones HTTPS salientes
   - Algunas redes corporativas bloquean esto

## 🔍 Troubleshooting

### El ESP32 no se conecta a WiFi
- Verifica credenciales WiFi
- Verifica que el ESP32 esté en rango
- Revisa el Monitor Serial para errores

### Error HTTP -1 o timeout
- Verifica que la URL sea correcta (HTTPS)
- Verifica que el servidor esté disponible
- Verifica que el ESP32 tenga Internet

### Los datos no aparecen en la app
- Verifica que el endpoint `/api/sensor/datos` esté funcionando
- Revisa los logs del servidor en Render
- Verifica que el formato JSON sea correcto

## 📝 Notas

- **USB Serial**: Solo funciona en desarrollo local
- **WiFi/HTTP**: Funciona tanto en desarrollo como en producción
- **Producción**: Siempre usa WiFi/HTTP, nunca USB
- **Desarrollo**: Puedes usar USB o WiFi, ambos funcionan

## ✅ Checklist

- [ ] ESP32 configurado con WiFi
- [ ] SERVER_URL configurado con URL de producción (HTTPS)
- [ ] Código subido al ESP32
- [ ] Monitor Serial muestra "✅ Enviado (HTTP 200)"
- [ ] Datos aparecen en la app de producción
