#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ============================================
// CONFIGURACIÓN HÍBRIDA: USB Serial + WiFi HTTP
// Funciona por USB en desarrollo y WiFi en producción
// ============================================

// Configuración WiFi (solo necesario si quieres usar WiFi también)
const char* ssid = "TU_WIFI_SSID";              // ← Opcional: para WiFi
const char* password = "TU_WIFI_PASSWORD";       // ← Opcional: para WiFi

// URL del servidor para producción (solo si usas WiFi)
const char* SERVER_URL = "https://regismac.onrender.com/api/sensor/datos";

// Configuración del sensor DS18B20 (igual que tu código original)
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Variables
float temperatura = 0.0;
unsigned long lastTime = 0;
unsigned long timerDelay = 1000; // Enviar cada 1 segundo

// Modo de funcionamiento
bool usarWiFi = false; // Cambiar a true para usar WiFi en producción

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== ESP32 Sensor Temperatura - Modo Híbrido ===");
  
  // Iniciar sensor
  sensors.begin();
  Serial.println("Sensor DS18B20 iniciado");
  
  // Primera lectura
  sensors.requestTemperatures();
  delay(1000);
  
  // Si se quiere usar WiFi, conectar
  if (usarWiFi) {
    Serial.println("\n📡 Modo WiFi activado");
    WiFi.begin(ssid, password);
    Serial.print("Conectando a WiFi: ");
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
      Serial.print("📍 IP: ");
      Serial.println(WiFi.localIP());
      Serial.print("🌐 Server: ");
      Serial.println(SERVER_URL);
    } else {
      Serial.println();
      Serial.println("❌ Error: No se pudo conectar a WiFi");
      Serial.println("   Continuando solo con USB Serial...");
      usarWiFi = false;
    }
  } else {
    Serial.println("\n📡 Modo USB Serial activado");
  }
  
  Serial.println("\nSistema listo - Enviando datos...\n");
}

void loop() {
  // Leer y enviar temperatura
  if ((millis() - lastTime) > timerDelay) {
    
    // Leer sensor
    sensors.requestTemperatures();
    temperatura = sensors.getTempCByIndex(0);
    
    if(temperatura != DEVICE_DISCONNECTED_C && temperatura > -55 && temperatura < 125) {
      
      // SIEMPRE enviar por USB Serial (para desarrollo local)
      Serial.print("{\"temperatura\":");
      Serial.print(temperatura, 2);
      Serial.print(",\"timestamp\":");
      Serial.print(millis());
      Serial.print(",\"sensor\":\"DS18B20\"");
      Serial.println("}");
      
      // ADEMÁS enviar por WiFi HTTP si está activado (para producción)
      if (usarWiFi && WiFi.status() == WL_CONNECTED) {
        enviarPorWiFi(temperatura);
      }
    }
    
    lastTime = millis();
  }
  
  // Reconectar WiFi si se desconectó
  if (usarWiFi && WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi desconectado. Reconectando...");
    WiFi.begin(ssid, password);
    delay(2000);
  }
}

void enviarPorWiFi(float temp) {
  // Crear objeto JSON
  String jsonData = "{";
  jsonData += "\"temperatura\":" + String(temp, 2);
  jsonData += "}";
  
  // Enviar datos al servidor
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode > 0) {
    Serial.print("✅ WiFi enviado (HTTP ");
    Serial.print(httpResponseCode);
    Serial.println(")");
  } else {
    Serial.print("❌ Error WiFi: ");
    Serial.println(http.errorToString(httpResponseCode));
  }
  
  http.end();
}
