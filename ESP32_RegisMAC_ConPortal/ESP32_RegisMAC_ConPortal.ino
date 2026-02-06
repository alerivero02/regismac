#include <WiFi.h>
#include <HTTPClient.h>
#include <DallasTemperature.h>
#include <OneWire.h>
#include <WebServer.h>
#include <Preferences.h>

// ============================================
// ESP32 - RegisMAC con Portal de Configuración WiFi
// ============================================

// Sensores DS18B20: uno en D2 (GPIO 2), otro en D4 (GPIO 4)
// Conexion: GND de los 2 sensores juntos (y al GND del ESP32);
//           3.3V de los 2 sensores juntos (y al 3.3V del ESP32);
//           Datos sensor 1 -> D2, Datos sensor 2 -> D4 (cada uno con pull-up 4.7k a 3.3V)
#define PIN_SENSOR_D2 2
#define PIN_SENSOR_D4 4
OneWire oneWireD2(PIN_SENSOR_D2);
OneWire oneWireD4(PIN_SENSOR_D4);
DallasTemperature sensorD2(&oneWireD2);
DallasTemperature sensorD4(&oneWireD4);

// Servidor web para portal de configuración
WebServer server(80);

// Preferencias para guardar configuración
Preferences preferences;

// Variables de configuración
String wifiSSID = "";
String wifiPassword = "";
String serverURL = "https://regismac.onrender.com/api/sensor/datos";

// Estado
bool isConfigured = false;
unsigned long ultimoEnvio = 0;
unsigned long ultimoLog = 0;
const unsigned long INTERVALO_ENVIO = 200;    // 200 ms envío al servidor (máxima rapidez)
const unsigned long INTERVALO_LOG_LOCAL = 200; // 200 ms logs en Monitor Serie

// Nombre del Access Point cuando no está configurado
const char* AP_SSID = "RegisMAC-Config";
const char* AP_PASSWORD = "config12345"; // Contraseña simple para el portal

// Declaraciones adelantadas de las funciones de manejo
void handleRoot();
void handleConfig();
void handleStatus();
void handleReset();
void conectarWiFi();
void iniciarPortalConfiguracion();
void enviarDatos();
void logLocalSensor();

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========================================");
  Serial.println("   ESP32 - RegisMAC con Portal WiFi");
  Serial.println("========================================\n");
  
  // Inicializar sensores en D2 y D4
  sensorD2.begin();
  sensorD4.begin();
  int nD2 = sensorD2.getDeviceCount();
  int nD4 = sensorD4.getDeviceCount();
  Serial.print("Pin D2: ");
  Serial.print(nD2);
  Serial.println(nD2 == 1 ? " sensor detectado" : " sensores detectados (revisar cable/pull-up)");
  Serial.print("Pin D4: ");
  Serial.print(nD4);
  Serial.println(nD4 == 1 ? " sensor detectado" : " sensores detectados (revisar cable/pull-up)");
  if (nD2 == 0 || nD4 == 0) {
    Serial.println("⚠️ Revisa: GND y 3.3V comunes, datos en D2/D4, pull-up 4.7k en cada dato");
  }
  Serial.println("📟 Logs locales cada 0.5 s en este Monitor Serie\n");
  
  // Cargar configuración guardada
  preferences.begin("regismac", false);
  wifiSSID = preferences.getString("ssid", "");
  wifiPassword = preferences.getString("password", "");
  serverURL = preferences.getString("server", "https://regismac.onrender.com/api/sensor/datos");
  preferences.end();
  
  // SIEMPRE iniciar el portal primero para que esté disponible inmediatamente
  Serial.println("🌐 Iniciando portal de configuración...");
  iniciarPortalConfiguracion();
  
  // Si hay configuración guardada, esperar 30 segundos antes de conectar
  // Esto da tiempo para acceder al portal si es necesario
  if (wifiSSID.length() > 0) {
    Serial.println("\n📡 Configuración WiFi encontrada:");
    Serial.print("   SSID: ");
    Serial.println(wifiSSID);
    Serial.print("   Server: ");
    Serial.println(serverURL);
    Serial.println("\n⏳ El portal está activo. Esperando 30 segundos...");
    Serial.println("   Si quieres cambiar la configuración, accede al portal ahora");
    Serial.println("   Si no haces nada, se conectará automáticamente al WiFi guardado\n");
    
    unsigned long tiempoInicio = millis();
    while (millis() - tiempoInicio < 30000) {
      delay(100);
      server.handleClient(); // Atender peticiones del portal
    }
    
    Serial.println("\n🔌 Intentando conectar al WiFi guardado...\n");
    conectarWiFi();
  } else {
    Serial.println("\n⚠️ No hay configuración WiFi guardada");
    Serial.println("📱 Conéctate a la red 'RegisMAC-Config' y abre http://192.168.4.1");
    Serial.println("   El portal permanecerá activo hasta que configures el WiFi\n");
  }
}

void loop() {
  // Log local en tiempo real cada 0.5 s (Arduino IDE → Monitor Serie)
  if (millis() - ultimoLog >= INTERVALO_LOG_LOCAL) {
    logLocalSensor();
    ultimoLog = millis();
  }

  if (isConfigured) {
    // Modo normal: enviar datos
    server.handleClient(); // Mantener servidor activo por si se necesita reconfigurar
    
    // Verificar conexión WiFi
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ WiFi desconectado. Reconectando...");
      conectarWiFi();
    }
    
    // Enviar datos cada intervalo
    if (millis() - ultimoEnvio >= INTERVALO_ENVIO) {
      enviarDatos();
      ultimoEnvio = millis();
    }
  } else {
    // Modo portal: atender peticiones del servidor
    server.handleClient();
  }
  
  delay(100);
}

void conectarWiFi() {
  Serial.print("📡 Conectando a WiFi: ");
  Serial.println(wifiSSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi conectado!");
    Serial.print("📍 IP asignada: ");
    Serial.println(WiFi.localIP());
    Serial.print("🌐 Server URL: ");
    Serial.println(serverURL);
    Serial.println("\n🚀 Iniciando envío de datos...\n");
    isConfigured = true;
  } else {
    Serial.println();
    Serial.println("❌ Error: No se pudo conectar a WiFi");
    Serial.println("🌐 Iniciando portal de configuración...");
    iniciarPortalConfiguracion();
  }
}

void iniciarPortalConfiguracion() {
  isConfigured = false;
  
  // Crear Access Point
  WiFi.mode(WIFI_AP);
  bool apCreado = WiFi.softAP(AP_SSID, AP_PASSWORD);
  
  if (!apCreado) {
    Serial.println("❌ Error: No se pudo crear el Access Point");
    delay(2000);
    ESP.restart();
    return;
  }
  
  IPAddress IP = WiFi.softAPIP();
  Serial.println("\n========================================");
  Serial.println("   🌐 PORTAL DE CONFIGURACIÓN ACTIVO");
  Serial.println("========================================");
  Serial.print("📶 Nombre de red (SSID): ");
  Serial.println(AP_SSID);
  Serial.print("🔑 Contraseña: ");
  Serial.println(AP_PASSWORD);
  Serial.print("📍 IP del portal: ");
  Serial.println(IP);
  Serial.println("📱 Conéctate a esta red y abre: http://192.168.4.1");
  Serial.println("========================================\n");
  
  // Configurar rutas del servidor web
  server.on("/", handleRoot);
  server.on("/config", HTTP_POST, handleConfig);
  server.on("/status", handleStatus);
  server.on("/reset", HTTP_POST, handleReset);
  
  server.begin();
  Serial.println("✅ Portal de configuración iniciado y listo");
  Serial.println("   El portal estará disponible hasta que se configure el WiFi\n");
}

void handleRoot() {
  String html = "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Configuracion ESP32 - RegisMAC</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.container{background:white;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:40px;max-width:500px;width:100%}h1{color:#333;margin-bottom:10px;font-size:28px}.subtitle{color:#666;margin-bottom:30px;font-size:14px}.form-group{margin-bottom:20px}label{display:block;color:#333;margin-bottom:8px;font-weight:600;font-size:14px}input{width:100%;padding:12px 15px;border:2px solid #e0e0e0;border-radius:10px;font-size:16px;transition:border-color 0.3s}input:focus{outline:none;border-color:#667eea}button{width:100%;padding:14px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;margin-top:10px}button:hover{transform:translateY(-2px);box-shadow:0 5px 15px rgba(102,126,234,0.4)}button:active{transform:translateY(0)}.info{background:#f0f4ff;border-left:4px solid #667eea;padding:15px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#555}.status{margin-top:20px;padding:15px;border-radius:10px;text-align:center;font-weight:600;display:none}.status.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb}.status.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb}.reset-btn{background:#dc3545;margin-top:20px}.reset-btn:hover{box-shadow:0 5px 15px rgba(220,53,69,0.4)}</style></head><body><div class=\"container\"><h1>Configuracion ESP32</h1><p class=\"subtitle\">RegisMAC - Sensor de Temperatura</p><div class=\"info\"><strong>Instrucciones:</strong><br>1. Ingresa los datos de tu red WiFi<br>2. El ESP32 se conectara automaticamente<br>3. Se reiniciara y comenzara a enviar datos</div><form id=\"configForm\"><div class=\"form-group\"><label for=\"ssid\">Nombre de Red WiFi (SSID)</label><input type=\"text\" id=\"ssid\" name=\"ssid\" required placeholder=\"Ej: MiWiFi\"></div><div class=\"form-group\"><label for=\"password\">Contrasena WiFi</label><input type=\"password\" id=\"password\" name=\"password\" required placeholder=\"Contrasena de tu WiFi\"></div><div class=\"form-group\"><label for=\"server\">URL del Servidor</label><input type=\"text\" id=\"server\" name=\"server\" value=\"https://regismac.onrender.com/api/sensor/datos\" placeholder=\"URL del servidor\"></div><button type=\"submit\">Guardar y Conectar</button></form><button class=\"reset-btn\" onclick=\"resetConfig()\">Resetear Configuracion</button><div id=\"status\" class=\"status\"></div></div><script>document.getElementById('configForm').addEventListener('submit',function(e){e.preventDefault();var ssid=document.getElementById('ssid').value;var password=document.getElementById('password').value;var server=document.getElementById('server').value;var statusDiv=document.getElementById('status');statusDiv.style.display='none';var ssidEncoded=encodeURIComponent(ssid);var passwordEncoded=encodeURIComponent(password);var serverEncoded=encodeURIComponent(server);var bodyData='ssid='+ssidEncoded+'&password='+passwordEncoded+'&server='+serverEncoded;fetch('/config',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:bodyData}).then(function(response){if(response.ok){statusDiv.className='status success';statusDiv.textContent='Configuracion guardada! El ESP32 se reiniciara en 3 segundos...';statusDiv.style.display='block';setTimeout(function(){statusDiv.textContent='Reiniciando... Por favor espera.';},3000)}else{throw new Error('Error al guardar')}}).catch(function(error){statusDiv.className='status error';statusDiv.textContent='Error al guardar configuracion. Intenta de nuevo.';statusDiv.style.display='block'})});function resetConfig(){if(!confirm('Estas seguro de resetear la configuracion?'))return;fetch('/reset',{method:'POST'}).then(function(response){if(response.ok){document.getElementById('status').className='status success';document.getElementById('status').textContent='Configuracion reseteada. Reiniciando...';document.getElementById('status').style.display='block'}}).catch(function(error){document.getElementById('status').className='status error';document.getElementById('status').textContent='Error al resetear.';document.getElementById('status').style.display='block'})}</script></body></html>";
  server.send(200, "text/html", html);
}

void handleConfig() {
  if (server.hasArg("ssid") && server.hasArg("password")) {
    wifiSSID = server.arg("ssid");
    wifiPassword = server.arg("password");
    if (server.hasArg("server")) {
      serverURL = server.arg("server");
    }
    
    // Guardar en preferencias
    preferences.begin("regismac", false);
    preferences.putString("ssid", wifiSSID);
    preferences.putString("password", wifiPassword);
    preferences.putString("server", serverURL);
    preferences.end();
    
    Serial.println("✅ Configuración guardada:");
    Serial.print("   SSID: ");
    Serial.println(wifiSSID);
    Serial.print("   Server: ");
    Serial.println(serverURL);
    
    server.send(200, "application/json", "{\"success\":true}");
    
    // Reiniciar después de 3 segundos
    delay(3000);
    ESP.restart();
  } else {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Faltan parámetros\"}");
  }
}

void handleStatus() {
  String status = "{";
  status += "\"wifi_connected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
  status += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  status += "\"ssid\":\"" + wifiSSID + "\",";
  status += "\"server\":\"" + serverURL + "\"";
  status += "}";
  server.send(200, "application/json", status);
}

void handleReset() {
  preferences.begin("regismac", false);
  preferences.clear();
  preferences.end();
  
  server.send(200, "application/json", "{\"success\":true}");
  delay(2000);
  ESP.restart();
}

void enviarDatos() {
  sensorD2.requestTemperatures();
  sensorD4.requestTemperatures();
  float tempD2 = sensorD2.getTempCByIndex(0);
  float tempD4 = sensorD4.getTempCByIndex(0);

  bool okD2 = (tempD2 != DEVICE_DISCONNECTED_C && tempD2 >= -55 && tempD2 <= 125);
  bool okD4 = (tempD4 != DEVICE_DISCONNECTED_C && tempD4 >= -55 && tempD4 <= 125);
  if (!okD2 && !okD4) {
    Serial.println("❌ Error al leer ambos sensores DS18B20");
    return;
  }

  // Mostrar datos en serial
  Serial.print("📊 Lectura: D2=");
  Serial.print(okD2 ? String(tempD2, 2) : "ERR");
  Serial.print("°C | D4=");
  Serial.print(okD4 ? String(tempD4, 2) : "ERR");
  Serial.print("°C | ");

  // JSON: temperatura = promedio o D2 si solo uno válido (compatibilidad); temperatura_d2 y temperatura_d4
  float temperatura = okD2 && okD4 ? (tempD2 + tempD4) / 2.0f : (okD2 ? tempD2 : tempD4);
  String jsonData = "{";
  jsonData += "\"temperatura\":" + String(temperatura, 2);
  jsonData += ",\"temperatura_d2\":" + String(okD2 ? tempD2 : -999, 2);
  jsonData += ",\"temperatura_d4\":" + String(okD4 ? tempD4 : -999, 2);
  jsonData += "}";
  
  // Enviar datos al servidor
  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode > 0) {
    Serial.print("✅ Enviado (HTTP ");
    Serial.print(httpResponseCode);
    Serial.println(")");
  } else {
    Serial.print("❌ Error (");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(http.errorToString(httpResponseCode));
  }
  
  http.end();
}

void logLocalSensor() {
  sensorD2.requestTemperatures();
  sensorD4.requestTemperatures();
  float tempD2 = sensorD2.getTempCByIndex(0);
  float tempD4 = sensorD4.getTempCByIndex(0);
  unsigned long t = millis() / 1000;

  bool okD2 = (tempD2 != DEVICE_DISCONNECTED_C && tempD2 >= -55 && tempD2 <= 125);
  bool okD4 = (tempD4 != DEVICE_DISCONNECTED_C && tempD4 >= -55 && tempD4 <= 125);

  Serial.print("[");
  Serial.print(t);
  Serial.print(" s] [D2] ");
  if (okD2) {
    Serial.print("T = ");
    Serial.print(tempD2, 2);
    Serial.print(" °C");
  } else {
    Serial.print("Error (raw:");
    Serial.print(tempD2);
    Serial.print(")");
  }
  Serial.print("  |  [D4] ");
  if (okD4) {
    Serial.print("T = ");
    Serial.print(tempD4, 2);
    Serial.print(" °C");
  } else {
    Serial.print("Error (raw:");
    Serial.print(tempD4);
    Serial.print(")");
  }
  Serial.println();
}
