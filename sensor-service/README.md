# Servicio Python para Sensor ESP32

Servicio independiente que maneja la comunicación con el ESP32 y expone una API REST.

## Instalación

```bash
pip install -r requirements.txt
```

## Uso

### Desarrollo Local

```bash
python main.py
```

O con un puerto específico:

```bash
SERIAL_PORT=COM3 python main.py
```

### Producción

```bash
gunicorn -w 1 -b 0.0.0.0:5000 main:app
```

## API Endpoints

- `GET /api/status` - Obtener estado del sensor
- `POST /api/start-test` - Iniciar test (body: `{"temperatura_inicial": 25.5}`)
- `POST /api/end-test` - Finalizar test
- `POST /api/cancel-test` - Cancelar test
- `POST /api/connect` - Conectar al puerto serial (body: `{"port_path": "COM3", "baud_rate": 115200}`)
- `POST /api/disconnect` - Desconectar del puerto serial
- `GET /api/ports` - Listar puertos disponibles

## Variables de Entorno

- `SERIAL_PORT` - Puerto serial por defecto (ej: COM3, /dev/ttyUSB0)
- `PORT` - Puerto del servidor Flask (default: 5000)
