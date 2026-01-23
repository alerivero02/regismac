# 🔧 Configuración ESP32 con Portal Web

## 🎯 Nueva Funcionalidad

Ahora puedes configurar el ESP32 **directamente desde tu navegador web** sin necesidad de editar código en Arduino IDE.

## 📡 Cómo Funciona

1. **Primera vez**: El ESP32 crea un Access Point (red WiFi) llamado `RegisMAC-Config`
2. **Te conectas** a esa red desde tu teléfono/computadora
3. **Abrir navegador**: Automáticamente se abre el portal de configuración (o ve a `http://192.168.4.1`)
4. **Ingresar datos**: SSID, contraseña WiFi y URL del servidor
5. **Guardar**: El ESP32 guarda la configuración y se reinicia
6. **Listo**: Se conecta automáticamente a tu WiFi y comienza a enviar datos

## 🚀 Instalación

### Paso 1: Cargar el Nuevo Código

1. Abre `ESP32_RegisMAC_ConPortal.ino` en Arduino IDE
2. Instala las librerías necesarias (si no las tienes):
   - `Preferences` (viene con ESP32)
   - `WebServer` (viene con ESP32)
3. Conecta el ESP32 por USB
4. Selecciona la placa: `Tools > Board > ESP32 Dev Module`
5. Haz clic en "Upload"

### Paso 2: Configurar WiFi

1. **Después de cargar el código**, el ESP32 creará una red WiFi llamada `RegisMAC-Config`
2. **Conecta tu teléfono/computadora** a esa red
   - Contraseña: `config12345`
3. **Abre un navegador** y ve a: `http://192.168.4.1`
   - En algunos dispositivos se abre automáticamente
4. **Ingresa los datos**:
   - **SSID**: Nombre de tu red WiFi
   - **Contraseña**: Contraseña de tu WiFi
   - **URL del Servidor**: `https://regismac.onrender.com/api/sensor/datos`
5. **Haz clic en "Guardar y Conectar"**
6. El ESP32 se reiniciará y se conectará automáticamente

### Paso 3: Verificar

1. El ESP32 se conectará a tu WiFi
2. Comenzará a enviar datos automáticamente
3. Puedes verificar en el Serial Monitor de Arduino IDE

## 🔄 Cambiar Configuración

Si necesitas cambiar la configuración WiFi:

### Opción 1: Desde el Portal (si el ESP32 no puede conectar)
1. Mantén presionado el botón RESET del ESP32 por 10 segundos
2. O desconecta y reconecta la alimentación
3. El ESP32 entrará en modo portal de nuevo
4. Sigue los pasos de configuración

### Opción 2: Botón Reset en el Portal
1. Si el ESP32 está conectado, puedes acceder al portal
2. Haz clic en "Resetear Configuración"
3. El ESP32 se reiniciará y entrará en modo portal

## 📱 Características del Portal

- ✅ **Interfaz moderna y responsive** - Funciona en móvil y desktop
- ✅ **Validación de campos** - No permite enviar datos vacíos
- ✅ **Feedback visual** - Muestra estado de la configuración
- ✅ **Reset fácil** - Botón para resetear configuración
- ✅ **Persistencia** - La configuración se guarda en memoria del ESP32

## 🔒 Seguridad

- El portal solo está disponible cuando el ESP32 está en modo configuración
- La contraseña del AP es simple (`config12345`) porque es solo para configuración inicial
- Una vez configurado, el ESP32 se conecta a tu WiFi y el portal no está accesible desde Internet

## ⚙️ Configuración Avanzada

### Cambiar Contraseña del Portal

En el código, cambia esta línea:
```cpp
const char* AP_PASSWORD = "tu_contraseña_aqui";
```

### Cambiar Nombre del Access Point

En el código, cambia esta línea:
```cpp
const char* AP_SSID = "Tu-Nombre-Aqui";
```

## 🐛 Solución de Problemas

### El portal no se abre
- Verifica que estés conectado a la red `RegisMAC-Config`
- Intenta `http://192.168.4.1` manualmente
- Verifica que la contraseña del AP sea `config12345`

### El ESP32 no se conecta a mi WiFi
- Verifica que el SSID sea correcto (sensible a mayúsculas/minúsculas)
- Verifica que la contraseña sea correcta
- Asegúrate de que tu WiFi esté en 2.4GHz (ESP32 no soporta 5GHz)

### Quiero resetear la configuración
- Mantén presionado RESET por 10 segundos
- O usa el botón "Resetear Configuración" en el portal
- O desconecta y reconecta la alimentación

## 📝 Notas

- La configuración se guarda en la memoria EEPROM del ESP32
- Si cambias de WiFi, simplemente resetea y configura de nuevo
- El portal solo está activo cuando el ESP32 no puede conectar a WiFi guardado

## 🎉 Ventajas

✅ **No necesitas Arduino IDE** para cambiar WiFi  
✅ **Configuración desde cualquier dispositivo** (teléfono, tablet, PC)  
✅ **Interfaz amigable** - No necesitas conocimientos técnicos  
✅ **Persistente** - La configuración se guarda permanentemente  
✅ **Fácil de resetear** - Si algo sale mal, resetea y configura de nuevo  
