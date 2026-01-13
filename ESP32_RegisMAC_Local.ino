#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ============================================
// CONFIGURACIÓN PARA PRUEBAS EN LOCAL
// MODIFICA ESTOS VALORES
// ============================================

// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";              // ← Cambia esto
const char* password = "TU_WIFI_PASSWORD";       // ← Cambia esto

// ⭐ CONFIGURA AQUÍ EL SERVER_URL PARA LOCAL ⭐
// Reemplaza 192.168.0.89 con la IP de tu computadora
// Puedes encontrarla ejecutando: ipconfig (Windows) o ifconfig (Linux/Mac)
// ⚠️ ACTUALIZA ESTA IP si tu IP local cambia
const char* SERVER_URL = "http://192.168.0.89:3000/api/sensor/datos";

// Configuración del sensor DHT
#define DHTPIN 4        // Pin donde está conectado el DHT (cambia según tu conexión)
#define DHTTYPE DHT22   // Tipo de sensor: DHT11 o DHT22

// Intervalo de envío (en milisegundos)
// Para tiempo real, usar 2 segundos. Para ahorrar batería, usar 5-10 segundos
const unsigned long INTERVALO_ENVIO = 2000; // 2 segundos (tiempo real)

// ============================================
// FIN DE CONFIGURACIÓN
// ============================================

DHT dht(DHTPIN, DHTTYPE);
unsigned long ultimoEnvio = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========================================");
  Serial.println("   ESP32 - RegisMAC Sensor (LOCAL)");
  Serial.println("========================================\n");
  
  // Inicializar sensor
  dht.begin();
  Serial.println("✅ Sensor DHT inicializado");
  
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
    Serial.println("   Verifica que el ESP32 esté en la misma red que tu PC");
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
  // Leer temperatura y humedad
  float temperatura = dht.readTemperature();
  float humedad = dht.readHumidity();
  
  // Verificar si la lectura fue exitosa
  if (isnan(temperatura) || isnan(humedad)) {
    Serial.println("❌ Error al leer el sensor DHT");
    Serial.println("   Verifica las conexiones del sensor");
    return;
  }
  
  // Mostrar datos en serial
  Serial.print("📊 Lectura: ");
  Serial.print("T=");
  Serial.print(temperatura, 1);
  Serial.print("°C | H=");
  Serial.print(humedad, 1);
  Serial.print("% | ");
  
  // Crear objeto JSON
  String jsonData = "{";
  jsonData += "\"temperatura\":" + String(temperatura, 2) + ",";
  jsonData += "\"humedad\":" + String(humedad, 2);
  jsonData += "}";
  
  // Enviar datos al servidor
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000); // Timeout de 5 segundos
  
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
    Serial.println("      - Que el servidor esté corriendo en el puerto 3000");
    Serial.println("      - Que la IP sea correcta (ejecuta 'ipconfig' para verificar)");
    Serial.println("      - Que el firewall permita conexiones en el puerto 3000");
  }
  
  http.end();
}

