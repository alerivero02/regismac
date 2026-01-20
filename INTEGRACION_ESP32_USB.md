# Integración ESP32 USB Serial

## ✅ Implementación Completada

Se ha integrado la comunicación USB Serial del ESP32 con la aplicación RegisMAC.

## 📋 Características Implementadas

### 1. Detección Automática de Puertos USB
- El sistema detecta automáticamente los puertos USB disponibles
- Identifica puertos que pueden ser ESP32 (Silicon Labs, CH340, FTDI, Espressif)
- Permite selección manual de puerto si hay múltiples dispositivos

### 2. Lectura Serial en Tiempo Real
- Lee datos JSON del puerto serial USB
- Formato esperado: `{"temperatura":25.5,"timestamp":12345,"sensor":"DS18B20"}`
- Actualiza el estado del sensor automáticamente
- Integrado con el sistema de tests existente

### 3. Gestión de Conexión
- Conexión automática al iniciar el servidor (solo en desarrollo)
- Conexión manual desde el frontend
- Desconexión manual
- Estado de conexión visible en tiempo real

### 4. Integración con Tests
- Los datos del sensor USB se integran automáticamente con el sistema de tests
- Detección automática de temperaturas objetivo (0°C y -8°C)
- Funciona igual que la conexión WiFi/HTTP anterior

## 🔧 Archivos Modificados/Creados

### Backend:
- `regismac-backend/src/services/serialPort.service.js` - Servicio de comunicación serial
- `regismac-backend/src/controllers/sensor.controller.js` - Integración con controlador
- `regismac-backend/src/routes/sensor.routes.js` - Nuevas rutas API
- `regismac-backend/index.js` - Inicialización automática
- `regismac-backend/package.json` - Dependencias agregadas

### Frontend:
- `regismac-frontend/src/services/api.js` - Nuevas funciones API
- `regismac-frontend/src/pages/Test.jsx` - UI de gestión USB

## 📡 Nuevos Endpoints API

### GET `/api/sensor/puertos`
Lista todos los puertos USB disponibles.

### POST `/api/sensor/conectar`
Conecta al ESP32 por USB.
```json
{
  "portPath": "COM3",  // Opcional, si no se envía detecta automáticamente
  "baudRate": 115200   // Opcional, por defecto 115200
}
```

### POST `/api/sensor/desconectar`
Desconecta del ESP32.

### GET `/api/sensor/conexion`
Obtiene el estado de la conexión serial.

## 🚀 Uso

### 1. Conectar ESP32 por USB

**Opción A: Automático (Recomendado)**
- Conecta el ESP32 por USB
- Abre el modal ESP32 en la página de Tests
- El sistema intentará detectar y conectar automáticamente

**Opción B: Manual**
- Abre el modal ESP32
- Haz clic en "Conectar"
- Selecciona el puerto USB de la lista
- Haz clic en "Conectar"

### 2. Verificar Conexión

El modal muestra el estado de conexión:
- ✅ Verde: Conectado (muestra el puerto)
- ⚠️ Amarillo: No conectado

### 3. Usar el Sensor

Una vez conectado, el sensor funciona igual que antes:
- Los datos se leen automáticamente del puerto serial
- Se actualizan en tiempo real en el modal
- Los tests funcionan igual que con WiFi/HTTP

## ⚙️ Configuración

### Variables de Entorno (Opcional)

```env
ENABLE_SERIAL_CONNECTION=true  # Habilitar conexión serial (default: true)
```

### Código Arduino

El código del ESP32 debe enviar datos en formato JSON:
```cpp
Serial.print("{\"temperatura\":");
Serial.print(temperatura, 2);
Serial.print(",\"timestamp\":");
Serial.print(millis());
Serial.print(",\"sensor\":\"DS18B20\"");
Serial.println("}");
```

## 🔍 Troubleshooting

### El ESP32 no se detecta automáticamente
1. Verifica que el ESP32 esté conectado por USB
2. Abre el modal y haz clic en "Conectar"
3. Selecciona manualmente el puerto de la lista

### No se reciben datos
1. Verifica que el código Arduino esté cargado correctamente
2. Verifica que el baud rate sea 115200
3. Verifica que el formato JSON sea correcto
4. Revisa la consola del servidor para ver errores

### El puerto no aparece en la lista
1. Verifica que el driver USB del ESP32 esté instalado
2. Desconecta y reconecta el ESP32
3. Reinicia el servidor

## 📝 Notas Importantes

- La conexión serial solo funciona en desarrollo local (no en producción web)
- El sistema mantiene compatibilidad con la conexión WiFi/HTTP anterior
- Los datos se actualizan cada 2 segundos (polling)
- El sistema detecta automáticamente las temperaturas objetivo durante los tests

## ✅ Próximos Pasos

1. Probar la conexión con el ESP32 físico
2. Verificar que los datos se reciban correctamente
3. Probar un test completo con el sensor USB
4. Ajustar la detección automática si es necesario
