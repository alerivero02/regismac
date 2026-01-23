# 🔧 Solución: Error COM4 Ocupado

## ❌ Error
```
A fatal error occurred: Could not open COM4, the port is busy or doesn't exist.
(could not open port 'COM4': PermissionError(13, 'Accesso negato.', None, 5))
```

## ✅ Soluciones (en orden de probabilidad)

### 1. Cerrar Serial Monitor
- **Causa más común**: El Serial Monitor está abierto y bloquea el puerto
- **Solución**: Cierra el Serial Monitor en Arduino IDE (botón X o `Ctrl+Shift+M`)
- Luego intenta subir el código de nuevo

### 2. Desconectar y Reconectar el ESP32
- Desconecta el cable USB del ESP32
- Espera 5 segundos
- Reconecta el cable USB
- Verifica que el puerto COM4 aparezca en `Tools > Port`
- Intenta subir de nuevo

### 3. Cerrar Otros Programas
Cierra cualquier programa que pueda estar usando el puerto:
- Otro Arduino IDE abierto
- PuTTY o cualquier terminal serial
- Programas de monitoreo de puertos
- Cualquier aplicación que use COM4

### 4. Reiniciar Arduino IDE
- Cierra completamente Arduino IDE
- Vuelve a abrirlo
- Intenta subir el código

### 5. Cambiar Puerto USB
- Prueba con otro puerto USB de tu computadora
- Algunos puertos USB pueden tener problemas de alimentación o permisos

### 6. Verificar Permisos (Windows)
Si el problema persiste:
1. Abre el **Administrador de dispositivos** (`Win + X` > Administrador de dispositivos)
2. Busca **Puertos (COM y LPT)**
3. Encuentra tu ESP32 (puede aparecer como "USB Serial Port" o "CH340" o "CP2102")
4. Click derecho > **Actualizar controlador**
5. O click derecho > **Deshabilitar** y luego **Habilitar**

### 7. Presionar Botón BOOT del ESP32
Algunos ESP32 requieren que presiones el botón **BOOT** mientras subes el código:
1. Mantén presionado el botón **BOOT** del ESP32
2. Haz clic en "Upload" en Arduino IDE
3. Cuando veas "Connecting..." en la parte inferior, suelta el botón BOOT
4. El código debería subirse

### 8. Verificar que el Puerto Existe
1. En Arduino IDE: `Tools > Port`
2. Verifica que **COM4** esté listado
3. Si no aparece, el ESP32 no está conectado o no está siendo reconocido
4. Revisa el Administrador de dispositivos para ver si el dispositivo aparece

## 🎯 Solución Rápida (Más Común)

**99% de las veces es esto:**
1. ✅ Cierra el Serial Monitor
2. ✅ Desconecta y reconecta el ESP32
3. ✅ Intenta subir de nuevo

## 📝 Nota

El código compiló correctamente (81% de espacio usado), así que el problema es solo con la carga al dispositivo, no con el código.
