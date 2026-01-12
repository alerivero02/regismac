# ✅ Cómo Verificar que el ESP32 Funciona en Producción

## 🔍 Métodos de Verificación

### 1️⃣ **Desde el Frontend (Método Más Fácil)**

1. **Inicia sesión** en tu aplicación en producción
2. Ve a la página de **Tests** (crear nuevo test)
3. Haz clic en el botón **"ESP32"** 
4. Se abrirá un **modal** que muestra:
   - ✅ **Temperatura actual** del sensor
   - ✅ **Humedad actual** del sensor
   - ✅ **Última actualización** (timestamp)
   - ✅ Si hay un test activo, muestra el progreso

**Si ves datos actualizándose cada 5 segundos, el ESP32 está funcionando correctamente.**

---

### 2️⃣ **Desde el Navegador (Endpoint Directo)**

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Primero necesitas estar autenticado, luego:
fetch('https://TU-URL/api/sensor/estado', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Estado del sensor:', data);
  if (data.temperatura !== null) {
    console.log('✅ ESP32 funcionando!');
    console.log('Temperatura:', data.temperatura, '°C');
    console.log('Humedad:', data.humedad, '%');
    console.log('Última actualización:', new Date(data.timestamp));
  } else {
    console.log('❌ No hay datos del ESP32 aún');
  }
});
```

---

### 3️⃣ **Prueba Manual con cURL o Postman**

#### Prueba 1: Verificar que el endpoint acepta datos

```bash
curl -X POST https://TU-URL/api/sensor/datos \
  -H "Content-Type: application/json" \
  -d '{"temperatura": 25.5, "humedad": 60.0}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Datos recibidos correctamente",
  "estado": null
}
```

#### Prueba 2: Verificar el estado (requiere autenticación)

Necesitas incluir tu cookie de sesión o token JWT.

---

### 4️⃣ **Desde el Monitor Serial del ESP32**

Si tienes acceso físico al ESP32:

1. Abre el **Monitor Serial** en Arduino IDE (115200 baudios)
2. Deberías ver mensajes como:
   ```
   ✅ WiFi conectado!
   📊 Lectura: T=25.3°C | H=60.1% | ✅ Enviado (HTTP 200)
   ```
3. Si ves errores HTTP (códigos 4xx o 5xx), hay un problema con la conexión o el servidor

---

### 5️⃣ **Revisar Logs del Servidor**

Si tienes acceso a los logs de producción (Render/Vercel):

- Busca peticiones POST a `/api/sensor/datos`
- Verifica que retornen código 200
- Si hay errores 400, verifica el formato de los datos

---

## 🎯 Verificación Rápida

### ✅ Checklist de Funcionamiento

- [ ] El ESP32 está conectado a WiFi
- [ ] El SERVER_URL está configurado correctamente (HTTPS para producción)
- [ ] El servidor está accesible desde internet
- [ ] El endpoint `/api/sensor/datos` acepta peticiones POST
- [ ] Los datos aparecen en el frontend (modal ESP32)
- [ ] La temperatura se actualiza cada 5 segundos

---

## 🐛 Problemas Comunes y Soluciones

### ❌ "No hay datos del ESP32 aún"

**Causas posibles:**
1. El ESP32 no está enviando datos
2. El SERVER_URL está mal configurado
3. Problemas de conectividad WiFi
4. El servidor no está accesible

**Solución:**
- Verifica el Monitor Serial del ESP32
- Verifica que el SERVER_URL use HTTPS (no HTTP) en producción
- Verifica que el servidor esté desplegado y funcionando

---

### ❌ Error HTTP 400 "Temperatura es requerida"

**Causa:** El ESP32 no está enviando el campo `temperatura` en el JSON

**Solución:** Verifica el código del ESP32, debe enviar:
```json
{
  "temperatura": 25.5,
  "humedad": 60.0
}
```

---

### ❌ Error HTTP 404 "Ruta no encontrada"

**Causa:** El SERVER_URL está mal configurado

**Solución:** Verifica que la URL sea:
```
https://TU-URL/api/sensor/datos
```
(No olvides el `/api/sensor/datos` al final)

---

### ❌ Error de conexión SSL/TLS

**Causa:** El ESP32 está intentando usar HTTP en lugar de HTTPS

**Solución:** Asegúrate de que el SERVER_URL use `https://` en producción

---

### ❌ Timeout o conexión rechazada

**Causas posibles:**
1. El servidor está caído
2. Firewall bloqueando la conexión
3. URL incorrecta

**Solución:**
- Verifica que el servidor esté funcionando: `https://TU-URL/api/health`
- Verifica la URL en el código del ESP32

---

## 📊 Verificación Continua

Para verificar que el ESP32 sigue funcionando:

1. **Monitorea el frontend** - El modal ESP32 muestra la última actualización
2. **Revisa periódicamente** - Si no hay actualizaciones en más de 30 segundos, puede haber un problema
3. **Configura alertas** - Si es crítico, considera agregar alertas cuando no hay datos

---

## 🔧 Script de Prueba Automática

Puedes usar el script `test-esp32.js` (ver archivo) para probar automáticamente:

```bash
node test-esp32.js https://TU-URL
```

---

## ✅ Confirmación Final

**El ESP32 está funcionando correctamente si:**

1. ✅ El modal ESP32 en el frontend muestra temperatura y humedad
2. ✅ Los valores se actualizan cada 5 segundos
3. ✅ El Monitor Serial muestra "✅ Enviado (HTTP 200)"
4. ✅ No hay errores en los logs del servidor

