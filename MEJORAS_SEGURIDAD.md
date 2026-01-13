# Mejoras de Seguridad Implementadas

## 📋 Resumen

Se han implementado múltiples capas de seguridad para proteger el backend de RegisMAC contra ataques comunes y vulnerabilidades.

## 🔒 Medidas de Seguridad Implementadas

### 1. Sanitización de Entrada
- **Archivo**: `regismac-backend/src/middleware/security.js`
- **Funcionalidad**:
  - Sanitización automática de `req.body`, `req.query` y `req.params`
  - Eliminación de caracteres peligrosos (`<`, `>`, `javascript:`, event handlers)
  - Protección contra XSS (Cross-Site Scripting)
  - Sanitización recursiva de objetos y arrays

### 2. Protección contra Path Traversal
- **Archivo**: `regismac-backend/src/middleware/security.js`
- **Funcionalidad**:
  - Detección de intentos de path traversal (`../`, `%2e%2e`, etc.)
  - Validación de rutas, query parameters y parámetros de URL
  - Bloqueo automático de patrones sospechosos

### 3. Validación de Payload
- **Funcionalidad**:
  - Validación de tamaño máximo de payload (50MB)
  - Validación de JSON antes de parsear
  - Protección contra payloads malformados

### 4. CORS Mejorado
- **Configuración**:
  - Lista blanca de orígenes permitidos
  - Validación estricta en producción
  - Logging de intentos de acceso desde orígenes no permitidos
  - Headers CORS optimizados

### 5. Rate Limiting Mejorado
- **Configuración**:
  - **General**: 500 requests/15min en producción
  - **Autenticación**: 20 requests/15min en producción
  - **Endpoints administrativos**: 30 requests/15min en producción
  - Logging automático de excesos de límite
  - Deshabilitable con `DISABLE_RATE_LIMIT=true` si es necesario

### 6. Logging de Seguridad
- **Archivo**: `regismac-backend/src/utils/securityLogger.js`
- **Eventos registrados**:
  - Intentos de autenticación (exitosos y fallidos)
  - Excesos de rate limiting
  - Actividad sospechosa
  - Intentos de path traversal
  - Accesos no autorizados
  - Acciones administrativas

### 7. Timeout de Requests
- **Configuración**: 30 segundos máximo por request
- **Funcionalidad**:
  - Termina automáticamente requests que tardan demasiado
  - Protección contra ataques de denegación de servicio (DoS)
  - Logging de timeouts

### 8. Helmet.js (Ya existente, mejorado)
- **Headers de seguridad**:
  - Content Security Policy (CSP)
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection
  - Strict-Transport-Security (en producción)

### 9. Sesiones Seguras
- **Configuración**:
  - Cookies `httpOnly` (no accesibles desde JavaScript)
  - Cookies `secure` en producción (solo HTTPS)
  - `sameSite: strict` en producción
  - Secret de sesión configurable

### 10. Validación de Autenticación Mejorada
- **Logging**:
  - Todos los intentos de login se registran
  - Razones de fallo documentadas
  - Accesos no autorizados registrados

## 📝 Variables de Entorno Relacionadas con Seguridad

```env
# CORS
ALLOWED_ORIGINS=https://tu-dominio.com,https://otro-dominio.com

# Rate Limiting
DISABLE_RATE_LIMIT=false  # true para deshabilitar (no recomendado en producción)

# Sesiones
SESSION_SECRET=tu-secret-super-seguro-aqui

# Frontend/Backend URLs
FRONTEND_URL=https://tu-dominio.com
BACKEND_URL=https://tu-dominio.com
```

## 🚀 Uso

Todas las medidas de seguridad están activas por defecto. No se requiere configuración adicional, pero se recomienda:

1. **Configurar `ALLOWED_ORIGINS`** en producción para restringir CORS
2. **Configurar `SESSION_SECRET`** con un valor seguro y único
3. **Revisar logs de seguridad** periódicamente
4. **No deshabilitar rate limiting** en producción a menos que sea absolutamente necesario

## 🔍 Monitoreo

Los eventos de seguridad se registran en:
- **Desarrollo**: Consola (todos los eventos)
- **Producción**: Consola (solo eventos críticos)

Para producción, se recomienda integrar con un servicio de logging externo (Sentry, LogRocket, etc.) modificando `securityLogger.js`.

## ⚠️ Notas Importantes

1. **Rate Limiting**: Está habilitado por defecto. Si experimentas problemas legítimos, puedes deshabilitarlo temporalmente con `DISABLE_RATE_LIMIT=true`, pero no es recomendado.

2. **CORS**: En desarrollo, se permiten todos los orígenes. En producción, configura `ALLOWED_ORIGINS` para mayor seguridad.

3. **Sanitización**: Se aplica automáticamente a todas las rutas. No es necesario configurarla manualmente.

4. **Logging**: Los logs de seguridad pueden contener información sensible. Asegúrate de protegerlos adecuadamente.

## 📚 Archivos Modificados/Creados

- ✅ `regismac-backend/src/middleware/security.js` (nuevo)
- ✅ `regismac-backend/src/utils/securityLogger.js` (nuevo)
- ✅ `regismac-backend/src/app.js` (modificado)
- ✅ `regismac-backend/src/controllers/usuarios.controller.js` (modificado)
- ✅ `regismac-backend/src/middleware/auth.js` (modificado)

## 🎯 Próximos Pasos Recomendados

1. Integrar con servicio de logging externo (Sentry, etc.)
2. Implementar alertas automáticas para eventos críticos
3. Revisar y ajustar límites de rate limiting según uso real
4. Implementar rotación de secrets de sesión
5. Considerar implementar 2FA para usuarios administrativos

