# Instalación del Servicio Python del Sensor ESP32

## 🎯 Objetivo
Configurar el servicio Python para que:
1. Se ejecute automáticamente al iniciar Windows
2. Lea datos del ESP32 vía USB cada 0.5 segundos
3. Envíe esos datos automáticamente al backend en producción (Render)
4. El backend emita actualizaciones vía WebSocket a todos los clientes

---

## 📋 Paso 1: Instalar Dependencias

Abre PowerShell o CMD en el directorio del proyecto y ejecuta:

```powershell
pip install -r requirements-esp32-service.txt
```

Esto instalará:
- Flask (servidor web local)
- Flask-CORS (para CORS)
- pyserial (comunicación USB serial)
- requests (enviar datos al backend)
- python-dotenv (cargar variables de entorno)

---

## 📋 Paso 2: Configurar URL del Backend

Edita `esp32-serial-service.py` y busca la línea:

```python
BACKEND_URL = os.getenv('BACKEND_URL', 'https://regismac.onrender.com')
```

O crea un archivo `.env` en el directorio raíz con:

```env
BACKEND_URL=https://regismac.onrender.com
SEND_TO_BACKEND=true
```

---

## 📋 Paso 3: Probar el Servicio Manualmente

1. Conecta el ESP32 vía USB
2. Ejecuta el script:

```powershell
python esp32-serial-service.py
```

O usa el script batch:

```powershell
.\start-sensor-service.bat
```

3. Deberías ver:
   ```
   ESP32 Serial Service - API REST
   📡 Backend URL: https://regismac.onrender.com
   📤 Enviar a backend: true
   🚀 Iniciando servidor en http://localhost:5000
   ```

4. Conecta el ESP32 usando la API:
   - Abre otro terminal
   - Ejecuta: `curl -X POST http://localhost:5000/api/sensor/conectar -H "Content-Type: application/json" -d "{\"portPath\":\"COM4\"}"`
   - (Reemplaza COM4 con tu puerto)

5. Verifica que los datos se envíen:
   - Deberías ver logs como: `[15:30:45.123] ✅ Datos enviados al backend: 26.3°C`
   - Verifica en la consola del navegador que lleguen actualizaciones vía WebSocket

---

## 📋 Paso 4: Configurar Inicio Automático

### Opción A: Usar el Script de Configuración (Recomendado)

1. Abre PowerShell **como Administrador**
2. Navega al directorio del proyecto:
   ```powershell
   cd C:\Users\utente\Documents\regismac
   ```
3. Ejecuta el script de configuración:
   ```powershell
   .\configurar-servicio-windows.ps1
   ```

Esto creará una tarea programada que se ejecutará automáticamente al iniciar sesión.

### Opción B: Configuración Manual

1. Abre "Programador de tareas" (Task Scheduler)
2. Crear tarea básica:
   - Nombre: `ESP32SensorService`
   - Trigger: "Al iniciar sesión"
   - Acción: "Iniciar un programa"
   - Programa: `C:\Users\utente\Documents\regismac\start-sensor-service.bat`
   - Marcar "Ejecutar con los privilegios más altos"
3. En "Configuración":
   - Marcar "Permitir ejecutar la tarea a petición"
   - Marcar "Ejecutar la tarea tan pronto como sea posible después de una programación omitida"
   - Marcar "Si la tarea falla, reiniciar cada: 1 minuto"
   - Intentar reiniciar hasta: 3 veces

---

## 📋 Paso 5: Verificar que Funciona

1. Reinicia tu PC o cierra sesión y vuelve a iniciar sesión
2. Verifica que el servicio esté corriendo:
   - Abre el Administrador de tareas
   - Busca `python.exe` ejecutándose
   - O verifica en el navegador: `http://localhost:5000/health`
3. Conecta el ESP32:
   - Abre la aplicación web en producción
   - O usa la API local para conectar
4. Verifica los logs:
   - Deberías ver mensajes cada 0.5 segundos: `[HH:MM:SS.mmm] ✅ Datos enviados al backend: XX.X°C`

---

## 🔧 Comandos Útiles

### Iniciar el servicio manualmente:
```powershell
.\start-sensor-service.bat
```

### Verificar estado de la tarea programada:
```powershell
Get-ScheduledTask -TaskName "ESP32SensorService" | Get-ScheduledTaskInfo
```

### Iniciar la tarea manualmente:
```powershell
Start-ScheduledTask -TaskName "ESP32SensorService"
```

### Detener la tarea:
```powershell
Stop-ScheduledTask -TaskName "ESP32SensorService"
```

### Ver logs en tiempo real:
Abre el archivo de log si lo configuraste, o ejecuta el servicio manualmente para ver los logs en consola.

---

## 🐛 Troubleshooting

### El servicio no inicia automáticamente
- Verifica que la tarea esté habilitada: `Get-ScheduledTask -TaskName "ESP32SensorService"`
- Verifica los logs de Windows: "Visor de eventos" → "Registros de Windows" → "Aplicación"

### Los datos no se envían al backend
- Verifica que `BACKEND_URL` esté correcto
- Verifica que el backend en Render esté activo (no dormido)
- Revisa los logs del servicio Python para ver errores

### El ESP32 no se conecta
- Verifica que el puerto COM esté correcto
- Cierra otras aplicaciones que puedan estar usando el puerto (Arduino IDE, etc.)
- Verifica que el ESP32 esté conectado y encendido

### El servicio se cierra inesperadamente
- Verifica los logs de Windows Event Viewer
- Asegúrate de que Python esté en el PATH
- Verifica que todas las dependencias estén instaladas

---

## 📝 Notas Importantes

1. **El servicio debe estar ejecutándose** para que los datos se envíen al backend
2. **El backend en Render debe estar activo** (no dormido) para recibir los datos
3. **Los datos se envían cada vez que el ESP32 los envía** (cada 0.5 segundos según tu configuración)
4. **El servicio local NO necesita estar expuesto a Internet** - Solo envía datos al backend, no recibe conexiones externas

---

## ✅ Verificación Final

Una vez configurado, deberías ver:

1. ✅ El servicio Python ejecutándose al iniciar Windows
2. ✅ Logs cada 0.5 segundos: `[HH:MM:SS.mmm] ✅ Datos enviados al backend: XX.X°C`
3. ✅ En la aplicación web (producción), actualizaciones en tiempo real vía WebSocket
4. ✅ El timestamp de "Última actualización" se actualiza cada 0.5 segundos

---

¿Necesitas ayuda con algún paso específico?
