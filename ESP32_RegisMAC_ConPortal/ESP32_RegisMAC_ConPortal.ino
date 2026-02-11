#include <WiFi.h>
#include <HTTPClient.h>
#include <DallasTemperature.h>
#include <OneWire.h>
#include <WebServer.h>
#include <Preferences.h>

// ============================================
// ESP32 - RegisMAC con Portal de ConfiguraciÃƒÂ³n WiFi
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

// Servidor web para portal de configuraciÃƒÂ³n
WebServer server(80);

// Preferencias para guardar configuraciÃƒÂ³n
Preferences preferences;

// Variables de configuraciÃƒÂ³n
String wifiSSID = "";
String wifiPassword = "";
String serverURL = "https://regismac.site/api/sensor/datos";

// Estado
bool isConfigured = false;
unsigned long ultimoEnvio = 0;
unsigned long ultimoLog = 0;
const unsigned long INTERVALO_ENVIO = 1000;   // 1 segundo envÃ­o al servidor
const unsigned long INTERVALO_LOG_LOCAL = 200; // 200 ms logs en Monitor Serie

// Nombre del Access Point cuando no estÃƒÂ¡ configurado
const char* AP_SSID = "RegisMAC-Config";
const char* AP_PASSWORD = "config12345"; // ContraseÃƒÂ±a simple para el portal

// Declaraciones adelantadas de las funciones de manejo
void handleRoot();
void handleConfig();
void handleStatus();
void handleReset();
void handleSensors();
void handleScanNetworks();
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
    Serial.println("Ã¢Å¡Â Ã¯Â¸Â Revisa: GND y 3.3V comunes, datos en D2/D4, pull-up 4.7k en cada dato");
  }
  Serial.println("Ã°Å¸â€œÅ¸ Logs locales cada 0.5 s en este Monitor Serie\n");
  
  // Cargar configuraciÃƒÂ³n guardada
  preferences.begin("regismac", false);
  wifiSSID = preferences.getString("ssid", "");
  wifiPassword = preferences.getString("password", "");
  serverURL = preferences.getString("server", "https://regismac.site/api/sensor/datos");
  preferences.end();
  
  // SIEMPRE iniciar el portal primero para que estÃƒÂ© disponible inmediatamente
  Serial.println("Ã°Å¸Å’Â Iniciando portal de configuraciÃƒÂ³n...");
  iniciarPortalConfiguracion();
  
  // Si hay configuraciÃƒÂ³n guardada, esperar 30 segundos antes de conectar
  // Esto da tiempo para acceder al portal si es necesario
  if (wifiSSID.length() > 0) {
    Serial.println("\nÃ°Å¸â€œÂ¡ ConfiguraciÃƒÂ³n WiFi encontrada:");
    Serial.print("   SSID: ");
    Serial.println(wifiSSID);
    Serial.print("   Server: ");
    Serial.println(serverURL);
    Serial.println("\nÃ¢ÂÂ³ El portal estÃƒÂ¡ activo. Esperando 30 segundos...");
    Serial.println("   Si quieres cambiar la configuraciÃƒÂ³n, accede al portal ahora");
    Serial.println("   Si no haces nada, se conectarÃƒÂ¡ automÃƒÂ¡ticamente al WiFi guardado\n");
    
    unsigned long tiempoInicio = millis();
    while (millis() - tiempoInicio < 30000) {
      delay(100);
      server.handleClient(); // Atender peticiones del portal
    }
    
    Serial.println("\nÃ°Å¸â€Å’ Intentando conectar al WiFi guardado...\n");
    conectarWiFi();
  } else {
    Serial.println("\nÃ¢Å¡Â Ã¯Â¸Â No hay configuraciÃƒÂ³n WiFi guardada");
    Serial.println("Ã°Å¸â€œÂ± ConÃƒÂ©ctate a la red 'RegisMAC-Config' y abre http://192.168.4.1");
    Serial.println("   El portal permanecerÃƒÂ¡ activo hasta que configures el WiFi\n");
  }
}

void loop() {
  // Log local en tiempo real cada 0.5 s (Arduino IDE Ã¢â€ â€™ Monitor Serie)
  if (millis() - ultimoLog >= INTERVALO_LOG_LOCAL) {
    logLocalSensor();
    ultimoLog = millis();
  }

  if (isConfigured) {
    // Modo normal: enviar datos
    server.handleClient(); // Mantener servidor activo por si se necesita reconfigurar
    
    // Verificar conexiÃƒÂ³n WiFi
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Ã¢Å¡Â Ã¯Â¸Â WiFi desconectado. Reconectando...");
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
  Serial.print("Ã°Å¸â€œÂ¡ Conectando a WiFi: ");
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
    Serial.println("Ã¢Å“â€¦ WiFi conectado!");
    Serial.print("Ã°Å¸â€œÂ IP asignada: ");
    Serial.println(WiFi.localIP());
    Serial.print("Ã°Å¸Å’Â Server URL: ");
    Serial.println(serverURL);
    Serial.println("\nÃ°Å¸Å¡â‚¬ Iniciando envÃƒÂ­o de datos...\n");
    isConfigured = true;
  } else {
    Serial.println();
    Serial.println("Ã¢ÂÅ’ Error: No se pudo conectar a WiFi");
    Serial.println("Ã°Å¸Å’Â Iniciando portal de configuraciÃƒÂ³n...");
    iniciarPortalConfiguracion();
  }
}

void iniciarPortalConfiguracion() {
  isConfigured = false;
  
  // Crear Access Point
  WiFi.mode(WIFI_AP);
  bool apCreado = WiFi.softAP(AP_SSID, AP_PASSWORD);
  
  if (!apCreado) {
    Serial.println("Ã¢ÂÅ’ Error: No se pudo crear el Access Point");
    delay(2000);
    ESP.restart();
    return;
  }
  
  IPAddress IP = WiFi.softAPIP();
  Serial.println("\n========================================");
  Serial.println("   Ã°Å¸Å’Â PORTAL DE CONFIGURACIÃƒâ€œN ACTIVO");
  Serial.println("========================================");
  Serial.print("Ã°Å¸â€œÂ¶ Nombre de red (SSID): ");
  Serial.println(AP_SSID);
  Serial.print("Ã°Å¸â€â€˜ ContraseÃƒÂ±a: ");
  Serial.println(AP_PASSWORD);
  Serial.print("Ã°Å¸â€œÂ IP del portal: ");
  Serial.println(IP);
  Serial.println("Ã°Å¸â€œÂ± ConÃƒÂ©ctate a esta red y abre: http://192.168.4.1");
  Serial.println("========================================\n");
  
  // Configurar rutas del servidor web
  server.on("/", handleRoot);
  server.on("/config", HTTP_POST, handleConfig);
  server.on("/status", handleStatus);
  server.on("/reset", HTTP_POST, handleReset);
  server.on("/sensors", handleSensors); // Endpoint para datos de sensores en tiempo real
  server.on("/scan", handleScanNetworks); // Endpoint para escanear redes WiFi disponibles
  
  server.begin();
  Serial.println("Ã¢Å“â€¦ Portal de configuraciÃƒÂ³n iniciado y listo");
  Serial.println("   El portal estarÃƒÂ¡ disponible hasta que se configure el WiFi\n");
}

void handleRoot() {
  String html = F("<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'>");
  html += F("<title>RegisMAC Config</title><style>");
  html += F("body{font-family:Arial;max-width:500px;margin:50px auto;padding:20px;background:#f5f5f5}");
  html += F(".card{background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-bottom:20px}");
  html += F("h1{color:#f97316;text-align:center;margin-bottom:10px}");
  html += F(".sensor{display:inline-block;width:30%;text-align:center;padding:15px;background:#eff6ff;border-radius:8px;margin:5px}");
  html += F(".temp{font-size:24px;font-weight:bold;color:#111}");
  html += F("input,button{width:100%;padding:12px;margin:8px 0;border-radius:8px;border:1px solid #ddd;font-size:14px}");
  html += F("button{background:#f97316;color:white;border:none;cursor:pointer;font-weight:bold}");
  html += F("button:hover{background:#ea580c}");
  html += F(".reset{background:#dc2626}.reset:hover{background:#b91c1c}");
  html += F("</style></head><body>");
  
  html += F("<h1>RegisMAC ESP32</h1>");
  
  // Sensores
  html += F("<div class='card'><h3>Sensores</h3>");
  html += F("<div class='sensor'>D2<br><span class='temp' id='d2'>--</span>Â°C</div>");
  html += F("<div class='sensor'>D4<br><span class='temp' id='d4'>--</span>Â°C</div>");
  html += F("<div class='sensor'>Prom<br><span class='temp' id='avg'>--</span>Â°C</div>");
  html += F("<p style='text-align:center;font-size:11px;color:#666;margin-top:10px' id='time'>Actualizando...</p></div>");
  
  // Formulario
  html += F("<div class='card'><h3>Configuracion WiFi</h3>");
  html += F("<form id='f'><input id='ssid' placeholder='Nombre WiFi (SSID)' required list='nets'>");
  html += F("<datalist id='nets'></datalist>");
  html += F("<button type='button' onclick='scan()'>Escanear Redes</button>");
  html += F("<input type='password' id='pass' placeholder='Contrasena WiFi' required>");
  html += F("<input id='srv' value='https://regismac.site/api/sensor/datos' placeholder='URL Servidor'>");
  html += F("<button type='submit'>Guardar y Conectar</button></form>");
  html += F("<button class='reset' onclick='reset()'>Resetear</button>");
  html += F("<div id='msg' style='margin-top:10px;padding:10px;border-radius:5px;display:none'></div></div>");
  
  // JavaScript compacto
  html += F("<script>");
  html += F("function upd(){fetch('/sensors').then(r=>r.json()).then(d=>{");
  html += F("let d2=d.temp_d2>-900?d.temp_d2.toFixed(1):'--';");
  html += F("let d4=d.temp_d4>-900?d.temp_d4.toFixed(1):'--';");
  html += F("document.getElementById('d2').textContent=d2;");
  html += F("document.getElementById('d4').textContent=d4;");
  html += F("if(d2!='--'&&d4!='--')document.getElementById('avg').textContent=((parseFloat(d2)+parseFloat(d4))/2).toFixed(1);");
  html += F("else if(d2!='--')document.getElementById('avg').textContent=d2;");
  html += F("else if(d4!='--')document.getElementById('avg').textContent=d4;");
  html += F("else document.getElementById('avg').textContent='--';");
  html += F("document.getElementById('time').textContent='Actualizado: '+new Date().toLocaleTimeString();");
  html += F("}).catch(e=>{})}");
  
  html += F("function scan(){fetch('/scan').then(r=>r.json()).then(d=>{");
  html += F("let list=document.getElementById('nets');list.innerHTML='';");
  html += F("if(d.networks){d.networks.forEach(n=>{let o=document.createElement('option');o.value=n.ssid;list.appendChild(o);})}");
  html += F("}).catch(e=>{})}");
  
  html += F("document.getElementById('f').onsubmit=function(e){e.preventDefault();");
  html += F("let data='ssid='+encodeURIComponent(document.getElementById('ssid').value);");
  html += F("data+='&password='+encodeURIComponent(document.getElementById('pass').value);");
  html += F("data+='&server='+encodeURIComponent(document.getElementById('srv').value);");
  html += F("fetch('/config',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data})");
  html += F(".then(r=>{if(r.ok){let m=document.getElementById('msg');m.style.background='#d1fae5';");
  html += F("m.style.color='#065f46';m.textContent='Guardado! Reiniciando...';m.style.display='block';}});return false;}");
  
  html += F("function reset(){if(confirm('Resetear?'))fetch('/reset',{method:'POST'}).then(r=>{");
  html += F("if(r.ok){let m=document.getElementById('msg');m.style.background='#d1fae5';m.textContent='Reseteado';m.style.display='block';}})}");
  
  html += F("setInterval(upd,500);upd();scan();");
  html += F("</script></body></html>");
  
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
    
    Serial.println("Ã¢Å“â€¦ ConfiguraciÃƒÂ³n guardada:");
    Serial.print("   SSID: ");
    Serial.println(wifiSSID);
    Serial.print("   Server: ");
    Serial.println(serverURL);
    
    server.send(200, "application/json", "{\"success\":true}");
    
    // Reiniciar despuÃƒÂ©s de 3 segundos
    delay(3000);
    ESP.restart();
  } else {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Faltan parÃƒÂ¡metros\"}");
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

// Endpoint para obtener datos de sensores en tiempo real
void handleSensors() {
  sensorD2.requestTemperatures();
  sensorD4.requestTemperatures();
  float tempD2 = sensorD2.getTempCByIndex(0);
  float tempD4 = sensorD4.getTempCByIndex(0);
  
  bool okD2 = (tempD2 != DEVICE_DISCONNECTED_C && tempD2 >= -55 && tempD2 <= 125);
  bool okD4 = (tempD4 != DEVICE_DISCONNECTED_C && tempD4 >= -55 && tempD4 <= 125);
  
  String json = "{";
  json += "\"temp_d2\":" + String(okD2 ? tempD2 : -999, 2) + ",";
  json += "\"temp_d4\":" + String(okD4 ? tempD4 : -999, 2) + ",";
  json += "\"temp_avg\":" + String((okD2 && okD4) ? ((tempD2 + tempD4) / 2.0f) : (okD2 ? tempD2 : (okD4 ? tempD4 : -999)), 2) + ",";
  json += "\"timestamp\":" + String(millis() / 1000);
  json += "}";
  
  server.send(200, "application/json", json);
}

// Endpoint para escanear redes WiFi disponibles
void handleScanNetworks() {
  Serial.println("ðŸ“¡ Escaneando redes WiFi...");
  
  int n = WiFi.scanNetworks();
  
  String json = "{\"networks\":[";
  
  if (n == 0) {
    json += "]}";
    server.send(200, "application/json", json);
    return;
  }
  
  for (int i = 0; i < n; ++i) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"ssid\":\"" + WiFi.SSID(i) + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
    json += "\"encryption\":" + String((WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "false" : "true");
    json += "}";
  }
  
  json += "]}";
  
  server.send(200, "application/json", json);
  Serial.println("âœ… Escaneo completado: " + String(n) + " redes encontradas");
}

void enviarDatos() {
  sensorD2.requestTemperatures();
  sensorD4.requestTemperatures();
  float tempD2 = sensorD2.getTempCByIndex(0);
  float tempD4 = sensorD4.getTempCByIndex(0);

  bool okD2 = (tempD2 != DEVICE_DISCONNECTED_C && tempD2 >= -55 && tempD2 <= 125);
  bool okD4 = (tempD4 != DEVICE_DISCONNECTED_C && tempD4 >= -55 && tempD4 <= 125);
  if (!okD2 && !okD4) {
    Serial.println("Ã¢ÂÅ’ Error al leer ambos sensores DS18B20");
    return;
  }

  // Mostrar datos en serial
  Serial.print("Ã°Å¸â€œÅ  Lectura: D2=");
  Serial.print(okD2 ? String(tempD2, 2) : "ERR");
  Serial.print("Ã‚Â°C | D4=");
  Serial.print(okD4 ? String(tempD4, 2) : "ERR");
  Serial.print("Ã‚Â°C | ");

  // JSON: temperatura = D2 (serbatoio) directamente, sin promediar con D4; temperatura_d2 y temperatura_d4
  float temperatura = okD2 ? tempD2 : tempD4;
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
    Serial.print("Ã¢Å“â€¦ Enviado (HTTP ");
    Serial.print(httpResponseCode);
    Serial.println(")");
  } else {
    Serial.print("Ã¢ÂÅ’ Error (");
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
    Serial.print(" Ã‚Â°C");
  } else {
    Serial.print("Error (raw:");
    Serial.print(tempD2);
    Serial.print(")");
  }
  Serial.print("  |  [D4] ");
  if (okD4) {
    Serial.print("T = ");
    Serial.print(tempD4, 2);
    Serial.print(" Ã‚Â°C");
  } else {
    Serial.print("Error (raw:");
    Serial.print(tempD4);
    Serial.print(")");
  }
  Serial.println();
}








