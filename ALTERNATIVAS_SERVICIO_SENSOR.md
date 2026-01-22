# Alternativas para el Servicio Python del Sensor

## 🎯 Problema
El servicio Python (`esp32-serial-service.py`) que lee datos del ESP32 vía USB necesita:
- ✅ Acceso directo al puerto USB serial (requiere máquina física)
- ✅ Estar siempre activo (sin sleep) para leer datos cada 0.5 segundos
- ✅ Enviar datos al backend en Render

**Limitación de Render:** El servicio se duerme después de 15 minutos de inactividad.

---

## 🚀 Alternativas para el Servicio Python

### Opción 1: VPS Pequeño (⭐ RECOMENDADO)

**Ventajas:**
- ✅ **Siempre activo** - Sin sleep
- ✅ **Acceso USB** - Si el VPS tiene acceso físico al ESP32
- ✅ **Control total** - Puedes instalar lo que necesites
- ✅ **Precio bajo** - $5-10/mes

**Proveedores recomendados:**
- **DigitalOcean Droplet** - $6/mes (1GB RAM, 1 vCPU)
- **Vultr** - $6/mes (1GB RAM, 1 vCPU)
- **Linode** - $5/mes (1GB RAM, 1 vCPU)
- **Hetzner** - €4/mes (2GB RAM, 1 vCPU) - Muy económico

**Configuración:**
1. Crear VPS con Ubuntu/Debian
2. Instalar Python 3 y dependencias
3. Configurar servicio systemd para que se inicie automáticamente
4. Configurar para que envíe datos al backend en Render

**Nota:** El VPS necesita acceso físico al ESP32 (mismo lugar físico o conexión remota al puerto USB).

---

### Opción 2: Ejecutar Localmente + Monitoreo

**Si el ESP32 está en tu PC local:**

**Ventajas:**
- ✅ **GRATIS** - No requiere servidor adicional
- ✅ **Acceso directo USB** - Funciona perfectamente
- ✅ **Siempre activo** - Si la PC está encendida

**Configuración:**
1. Ejecutar el servicio Python en tu PC
2. Configurar para que se inicie automáticamente al iniciar Windows
3. Usar Task Scheduler de Windows para reiniciar si falla
4. El servicio envía datos directamente al backend en Render

**Script de inicio automático:**
```batch
@echo off
cd C:\Users\utente\Documents\regismac
python esp32-serial-service.py
```

---

### Opción 3: Raspberry Pi (Si tienes acceso físico)

**Ventajas:**
- ✅ **Siempre activo** - Bajo consumo
- ✅ **Acceso USB directo** - Perfecto para ESP32
- ✅ **Costo único** - ~$50-100 (no mensual)
- ✅ **Muy confiable** - Diseñado para 24/7

**Configuración:**
1. Instalar Raspberry Pi OS
2. Conectar ESP32 vía USB
3. Instalar Python y dependencias
4. Configurar servicio systemd
5. El servicio envía datos al backend en Render

---

### Opción 4: Servicio en Railway/Fly.io (Solo si no necesitas USB)

**⚠️ LIMITACIÓN:** Railway y Fly.io NO tienen acceso a puertos USB físicos.

**Solo funciona si:**
- El ESP32 se conecta vía WiFi/Internet (no USB)
- O usas un gateway intermedio que lee USB y envía vía HTTP

---

## 📋 Comparación de Opciones

| Opción | Costo | Acceso USB | Siempre Activo | Facilidad | Recomendado |
|--------|-------|------------|----------------|-----------|-------------|
| **VPS** | $5-10/mes | ✅ Sí | ✅ Sí | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **PC Local** | Gratis | ✅ Sí | ⚠️ Si PC encendida | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Raspberry Pi** | $50-100 (único) | ✅ Sí | ✅ Sí | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Railway/Fly.io** | $5/mes | ❌ No | ✅ Sí | ⭐⭐⭐ | ⭐⭐ |

---

## 🎯 Recomendación

### Si el ESP32 está en tu PC:
**Opción 2: Ejecutar localmente** - Es gratis y funciona perfectamente si tu PC está encendida.

### Si necesitas un servidor dedicado:
**Opción 1: VPS pequeño** - DigitalOcean o Vultr, $6/mes, siempre activo.

### Si tienes presupuesto para hardware:
**Opción 3: Raspberry Pi** - Inversión única, muy confiable para 24/7.

---

## 🔧 Configuración del Servicio Python

### Para VPS o Raspberry Pi (Linux)

**1. Crear servicio systemd:**

```bash
sudo nano /etc/systemd/system/esp32-sensor.service
```

**Contenido:**
```ini
[Unit]
Description=ESP32 Serial Sensor Service
After=network.target

[Service]
Type=simple
User=tu-usuario
WorkingDirectory=/ruta/a/regismac
ExecStart=/usr/bin/python3 /ruta/a/regismac/esp32-serial-service.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**2. Activar servicio:**
```bash
sudo systemctl enable esp32-sensor
sudo systemctl start esp32-sensor
sudo systemctl status esp32-sensor
```

---

### Para PC Windows

**1. Crear tarea en Task Scheduler:**
- Abrir "Programador de tareas"
- Crear tarea básica
- Trigger: "Al iniciar sesión"
- Acción: "Iniciar un programa"
- Programa: `python`
- Argumentos: `C:\Users\utente\Documents\regismac\esp32-serial-service.py`
- Marcar "Ejecutar con los privilegios más altos"

**2. O crear script .bat y agregarlo al inicio:**
- Crear `start-sensor.bat` en `C:\Users\utente\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

---

## 📝 Modificar Servicio Python para Enviar a Render

El servicio Python necesita enviar datos al backend en Render. Modificar `esp32-serial-service.py`:

```python
import requests

# Al recibir datos del ESP32:
def enviar_a_backend(temperatura, humedad=None):
    try:
        backend_url = os.getenv('BACKEND_URL', 'https://regismac.onrender.com')
        response = requests.post(
            f'{backend_url}/api/sensor/datos',
            json={'temperatura': temperatura, 'humedad': humedad},
            timeout=2
        )
        if response.status_code == 200:
            print(f"✅ Datos enviados al backend: {temperatura}°C")
    except Exception as e:
        print(f"⚠️ Error enviando al backend: {e}")
```

---

## 🎯 Próximos Pasos

1. **Decidir dónde ejecutar el servicio Python:**
   - PC local (gratis, si está encendida)
   - VPS (siempre activo, $6/mes)
   - Raspberry Pi (siempre activo, inversión única)

2. **Configurar el servicio para que se inicie automáticamente**

3. **Modificar el servicio para enviar datos al backend en Render**

4. **Probar que las actualizaciones lleguen cada 0.5 segundos**

---

¿Quieres que te ayude a configurar alguna de estas opciones?
