# Servicio Python para Sensor ESP32

## Descripción

Servicio independiente en Python que maneja la comunicación con el ESP32 y expone una API REST optimizada. Esto reduce la carga en el backend principal y permite un mejor manejo de los datos del sensor.

## Ventajas

1. **Separación de responsabilidades**: El servicio Python se encarga solo del sensor
2. **Mejor rendimiento**: Lectura continua del puerto serial sin bloquear el backend
3. **Polling optimizado**: El frontend puede hacer polling adaptativo según el estado del test
4. **Escalabilidad**: Puede ejecutarse en un servidor separado o en la misma máquina

## Instalación

```bash
cd sensor-service
pip install -r requirements.txt
```

## Configuración

### Variables de Entorno

```bash
# Puerto serial por defecto (opcional)
SERIAL_PORT=COM3  # Windows
# SERIAL_PORT=/dev/ttyUSB0  # Linux

# Puerto del servidor Flask
PORT=5000
```

## Uso

### Desarrollo Local

```bash
python main.py
```

### Producción con Gunicorn

```bash
gunicorn -w 1 -b 0.0.0.0:5000 main:app
```

### Con Docker (opcional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY main.py .

EXPOSE 5000
CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:5000", "main:app"]
```

## API Endpoints

### GET `/api/status`
Obtener estado actual del sensor.

**Respuesta:**
```json
{
  "temperatura": 25.5,
  "humedad": null,
  "timestamp": 1234567890.123,
  "test_activo": false,
  "temperatura_inicial": null,
  "tiempo_inicio": null,
  "tiempo_transcurrido": 0,
  "tiempo_0_grados": null,
  "tiempo_menos8_grados": null,
  "connected": true,
  "port": "COM3"
}
```

### POST `/api/start-test`
Iniciar un test.

**Body:**
```json
{
  "temperatura_inicial": 25.5
}
```

### POST `/api/end-test`
Finalizar un test y obtener resultados.

**Respuesta:**
```json
{
  "success": true,
  "resultado": {
    "temperatura_inicial": 25.5,
    "tiempo_0_grados": 120,
    "tiempo_menos8_grados": 300,
    "humedad": null
  }
}
```

### POST `/api/cancel-test`
Cancelar un test activo.

### POST `/api/connect`
Conectar al puerto serial.

**Body:**
```json
{
  "port_path": "COM3",
  "baud_rate": 115200
}
```

### POST `/api/disconnect`
Desconectar del puerto serial.

### GET `/api/ports`
Listar puertos seriales disponibles.

## Integración con el Frontend

El frontend puede usar este servicio directamente o a través del backend Node.js. Para usar directamente:

```javascript
const SENSOR_SERVICE_URL = 'http://localhost:5000';

// Obtener estado
const estado = await fetch(`${SENSOR_SERVICE_URL}/api/status`).then(r => r.json());

// Iniciar test
await fetch(`${SENSOR_SERVICE_URL}/api/start-test`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ temperatura_inicial: 25.5 })
});
```

## Polling Adaptativo

El frontend implementa polling adaptativo:
- **Durante test activo**: 1 segundo (máxima precisión)
- **Sin test activo**: 5 segundos (reduce carga del servidor)

Esto reduce significativamente las peticiones al servidor cuando no hay un test en curso.

## Troubleshooting

### El puerto no se detecta
- Verifica que el ESP32 esté conectado
- En Linux, asegúrate de tener permisos: `sudo usermod -a -G dialout $USER`
- Reinicia después de agregar permisos

### Error de conexión
- Verifica que el puerto no esté en uso por otra aplicación
- Cierra Arduino IDE o Monitor Serial si están abiertos
- Verifica el baud rate (debe ser 115200)

### Datos no llegan
- Verifica que el código del ESP32 esté enviando datos en formato JSON
- Revisa los logs del servicio Python
- Verifica la conexión USB
