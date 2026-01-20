#include <WiFi.h>
#include <HTTPClient.h>
#include <DallasTemperature.h>
#include <OneWire.h>

// ============================================
// CONFIGURACIÓN PARA PRODUCCIÓN (RENDER)
// MODIFICA ESTOS VALORES
// ============================================

// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";              // ← Cambia esto con tu WiFi
const char* password = "TU_WIFI_PASSWORD";       // ← Cambia esto con tu contraseña WiFi

// ⭐ CONFIGURA AQUÍ EL SERVER_URL PARA PRODUCCIÓN ⭐
// Reemplaza con tu URL de Render (ej: https://regismac.onrender.com)
const char* SERVER_URL = "https://regismac.onrender.com/api/sensor/datos";

// Configuración del sensor DS18B20 (según tu código Arduino)
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Intervalo de envío (en milisegundos)
const unsigned long INTERVALO_ENVIO = 1000; // 1 segundo para actualización en tiempo real

// ============================================
// FIN DE CONFIGURACIÓN
// ============================================

unsigned long ultimoEnvio = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========================================");
  Serial.println("   ESP32 - RegisMAC Sensor (PRODUCCIÓN)");
  Serial.println("========================================\n");
  
  // Inicializar sensor DS18B20
  sensors.begin();
  Serial.println("✅ Sensor DS18B20 inicializado");
  
  // Conectar a WiFi
  WiFi.begin(ssid, password);
  Serial.print("📡 Conectando a WiFi: ");
  Serial.println(ssid);
  
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi conectado!");
    Serial.print("📍 IP asignada al ESP32: ");
    Serial.println(WiFi.localIP());
    Serial.print("🌐 Server URL: ");
    Serial.println(SERVER_URL);
    Serial.println("\n🚀 Iniciando envío de datos...\n");
  } else {
    Serial.println();
    Serial.println("❌ Error: No se pudo conectar a WiFi");
    Serial.println("   Verifica las credenciales WiFi");
  }
}

void loop() {
  // Verificar conexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi desconectado. Reconectando...");
    WiFi.begin(ssid, password);
    
    int intentos = 0;
    while (WiFi.status() != WL_CONNECTED && intentos < 30) {
      delay(500);
      Serial.print(".");
      intentos++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✅ WiFi reconectado!");
    } else {
      Serial.println("\n❌ Error al reconectar WiFi");
      delay(5000);
      return;
    }
  }
  
  // Enviar datos cada INTERVALO_ENVIO
  if (millis() - ultimoEnvio >= INTERVALO_ENVIO) {
    enviarDatos();
    ultimoEnvio = millis();
  }
  
  delay(100);
}

void enviarDatos() {
  // Leer temperatura del sensor DS18B20
  sensors.requestTemperatures();
  float temperatura = sensors.getTempCByIndex(0);
  
  // Verificar si la lectura fue exitosa
  if (temperatura == DEVICE_DISCONNECTED_C || temperatura < -55 || temperatura > 125) {
    Serial.println("❌ Error al leer el sensor DS18B20");
    Serial.println("   Verifica las conexiones del sensor");
    return;
  }
  
  // Mostrar datos en serial
  Serial.print("📊 Lectura: ");
  Serial.print("T=");
  Serial.print(temperatura, 2);
  Serial.print("°C | ");
  
  // Crear objeto JSON (solo temperatura, sin humedad para DS18B20)
  String jsonData = "{";
  jsonData += "\"temperatura\":" + String(temperatura, 2);
  jsonData += "}";
  
  // Enviar datos al servidor
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // Timeout de 10 segundos para producción
  
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode > 0) {
    Serial.print("✅ Enviado (HTTP ");
    Serial.print(httpResponseCode);
    Serial.println(")");
    
    // Mostrar respuesta del servidor
    if (httpResponseCode == 200) {
      String response = http.getString();
      Serial.print("   Respuesta: ");
      Serial.println(response);
    }
  } else {
    Serial.print("❌ Error (");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(http.errorToString(httpResponseCode));
    Serial.print("   URL: ");
    Serial.println(SERVER_URL);
    Serial.println("   💡 Verifica:");
    Serial.println("      - Que la URL de producción sea correcta");
    Serial.println("      - Que el ESP32 tenga conexión a Internet");
    Serial.println("      - Que el servidor esté disponible");
  }
  
  http.end();
}
