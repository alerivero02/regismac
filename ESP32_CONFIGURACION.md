# 🔧 Configuración del ESP32 - RegisMAC

## 📋 Configuración del SERVER_URL

El ESP32 debe enviar datos de temperatura y humedad al siguiente endpoint:

**Endpoint:** `POST /api/sensor/datos`

### 🔗 URLs del Servidor

#### Para Desarrollo Local:
```
http://TU_IP_LOCAL:3000/api/sensor/datos
```
**Ejemplo:** `http://192.168.1.100:3000/api/sensor/datos`

> 💡 **Nota:** Reemplaza `TU_IP_LOCAL` con la IP local de tu computadora donde corre el servidor. Puedes encontrarla ejecutando `ipconfig` en Windows o `ifconfig` en Linux/Mac.

#### Para Producción (Render/Vercel):
```
https://TU-SERVICIO.onrender.com/api/sensor/datos
```
o
```
https://TU-URL-VERCEL.vercel.app/api/sensor/datos
```

> ⚠️ **Importante:** Reemplaza `TU-SERVICIO` o `TU-URL-VERCEL` con la URL real de tu servicio desplegado.

## 📝 Ejemplo de Código ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ============================================
// CONFIGURACIÓN - MODIFICA ESTOS VALORES
// ============================================

// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// ⭐ CONFIGURA AQUÍ EL SERVER_URL ⭐
const char* SERVER_URL = "http://192.168.1.100:3000/api/sensor/datos";
// Para producción, usa:
// const char* SERVER_URL = "https://TU-SERVICIO.onrender.com/api/sensor/datos";

// Configuración del sensor DHT
#define DHTPIN 4        // Pin donde está conectado el DHT
#define DHTTYPE DHT22   // Tipo de sensor (DHT11 o DHT22)

// Intervalo de envío (en milisegundos)
const unsigned long INTERVALO_ENVIO = 5000; // 5 segundos

// ============================================
// FIN DE CONFIGURACIÓN
// ============================================

DHT dht(DHTPIN, DHTTYPE);
unsigned long ultimoEnvio = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== Iniciando ESP32 ===");
  
  // Inicializar sensor
  dht.begin();
  Serial.println("✅ Sensor DHT inicializado");
  
  // Conectar a WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("✅ WiFi conectado!");
  Serial.print("IP asignada: ");
  Serial.println(WiFi.localIP());
  Serial.print("Server URL: ");
  Serial.println(SERVER_URL);
}

void loop() {
  // Verificar conexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi desconectado. Reconectando...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("\n✅ WiFi reconectado!");
  }
  
  // Enviar datos cada INTERVALO_ENVIO
  if (millis() - ultimoEnvio >= INTERVALO_ENVIO) {
    enviarDatos();
    ultimoEnvio = millis();
  }
  
  delay(100);
}

void enviarDatos() {
  // Leer temperatura y humedad
  float temperatura = dht.readTemperature();
  float humedad = dht.readHumidity();
  
  // Verificar si la lectura fue exitosa
  if (isnan(temperatura) || isnan(humedad)) {
    Serial.println("❌ Error al leer el sensor DHT");
    return;
  }
  
  Serial.print("📊 Temperatura: ");
  Serial.print(temperatura);
  Serial.print("°C | Humedad: ");
  Serial.print(humedad);
  Serial.println("%");
  
  // Crear objeto JSON
  String jsonData = "{";
  jsonData += "\"temperatura\":" + String(temperatura) + ",";
  jsonData += "\"humedad\":" + String(humedad);
  jsonData += "}";
  
  // Enviar datos al servidor
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode > 0) {
    Serial.print("✅ Datos enviados. Código de respuesta: ");
    Serial.println(httpResponseCode);
    
    String response = http.getString();
    Serial.println("Respuesta del servidor: " + response);
  } else {
    Serial.print("❌ Error al enviar datos. Código: ");
    Serial.println(httpResponseCode);
    Serial.print("Error: ");
    Serial.println(http.errorToString(httpResponseCode));
  }
  
  http.end();
}
```

## 🔍 Cómo Encontrar tu IP Local

### Windows:
```powershell
ipconfig
```
Busca la dirección IPv4 de tu adaptador de red activo (ej: `192.168.1.100`)

### Linux/Mac:
```bash
ifconfig
```
o
```bash
ip addr show
```

## ✅ Verificación

### Verificación Rápida (Producción)

**Método más fácil:**
1. Inicia sesión en tu aplicación en producción
2. Ve a la página de **Tests** (crear nuevo test)
3. Haz clic en el botón **"ESP32"**
4. Deberías ver la temperatura y humedad actualizándose cada 5 segundos

**Si ves datos actualizándose, el ESP32 está funcionando correctamente.**

### Verificación Detallada

Ver el archivo `VERIFICAR_ESP32.md` para métodos completos de verificación, incluyendo:
- Verificación desde el frontend
- Verificación desde el navegador (consola)
- Pruebas con cURL/Postman
- Script de prueba automática (`test-esp32.js`)

### Verificación Local

1. Asegúrate de que el servidor esté corriendo en el puerto 3000
2. Verifica que el ESP32 esté conectado a la misma red WiFi
3. Revisa el monitor serial del ESP32 para ver los mensajes de confirmación
4. Verifica en el frontend que los datos estén llegando correctamente

## 🐛 Solución de Problemas

### Error: "Connection refused"
- Verifica que el servidor esté corriendo
- Verifica que la IP y el puerto sean correctos
- Asegúrate de que el firewall permita conexiones en el puerto 3000

### Error: "Network unreachable"
- Verifica que el ESP32 esté conectado a WiFi
- Verifica que el ESP32 esté en la misma red que el servidor

### Error: "Timeout"
- Verifica que la URL del servidor sea correcta
- Verifica que el servidor esté accesible desde la red local

## 📌 Notas Importantes

- El endpoint `/api/sensor/datos` es **público** (no requiere autenticación)
- El formato de datos debe ser JSON con `temperatura` y `humedad`
- La temperatura es **requerida**, la humedad es **opcional**
- El servidor acepta datos cada pocos segundos sin problemas

