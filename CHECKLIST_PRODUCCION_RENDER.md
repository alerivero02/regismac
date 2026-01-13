# Checklist de Configuración para Producción en Render

## ✅ Cambios Realizados

### 1. Botón ESP32 Oculto en Producción
- ✅ El botón ESP32 solo aparece en desarrollo/local
- ✅ Se detecta producción por hostname (no localhost, no IPs locales)
- ✅ El modal ESP32 sigue funcionando si se accede directamente, pero el botón no se muestra

### 2. Configuración de Render (render.yaml)
- ✅ `buildCommand`: `npm run build:render` - Genera Prisma Client y construye frontend
- ✅ `startCommand`: `npm start` - Ejecuta prestart.js y luego inicia el servidor
- ✅ `PORT`: 10000 (configurado en render.yaml)
- ✅ `NODE_ENV`: production

### 3. Script de Pre-inicio (prestart.js)
- ✅ Verifica que Prisma Client esté generado antes de iniciar
- ✅ Si no existe, lo genera automáticamente
- ✅ Maneja errores gracefully en producción

### 4. Routing Optimizado para Render
- ✅ Rutas de API (`/api/*`) tienen prioridad
- ✅ Frontend se sirve después de las rutas de API
- ✅ Archivos estáticos con cache headers optimizados
- ✅ SPA routing funcionando correctamente

### 5. Corrección de Usuarios Técnicos
- ✅ Usuarios `Mahmudlhasan429@gmail.com` y `marcocarinci.ecosun@gmail.com` se corrigen automáticamente
- ✅ Se asegura rol 'tecnico' y estado 'aprobado'
- ✅ Se crea registro de técnico si no existe

## 📋 Variables de Entorno Requeridas en Render

Asegúrate de configurar estas variables en Render Dashboard:

1. **DATABASE_URL** - Connection string de PostgreSQL
2. **SESSION_SECRET** - Secret para sesiones (generar uno seguro)
3. **FRONTEND_URL** - URL del frontend (ej: https://regismac.onrender.com)
4. **BACKEND_URL** - URL del backend (misma que FRONTEND_URL en Render)
5. **GOOGLE_CLIENT_ID** - (Opcional) Para autenticación Google
6. **GOOGLE_CLIENT_SECRET** - (Opcional) Para autenticación Google
7. **PORT** - Ya configurado en render.yaml como 10000
8. **NODE_ENV** - Ya configurado en render.yaml como production

## 🔍 Verificaciones Post-Deploy

Después de que Render haga el deploy, verifica:

1. ✅ El servidor inicia correctamente (revisar logs en Render)
2. ✅ Prisma Client se genera durante el build
3. ✅ Las rutas `/api/*` funcionan correctamente
4. ✅ El frontend se sirve en la ruta raíz `/`
5. ✅ El botón ESP32 NO aparece en producción
6. ✅ Los usuarios técnicos aparecen en Registri y Test
7. ✅ El login funciona correctamente
8. ✅ No hay errores en la consola del navegador

## 🐛 Troubleshooting

Si hay problemas:

1. **Error de Prisma Client**: Verificar que `npx prisma generate` se ejecute en buildCommand
2. **Error de routing**: Verificar que las rutas de API estén antes del frontend
3. **Error de base de datos**: Verificar DATABASE_URL en variables de entorno
4. **Error de sesión**: Verificar SESSION_SECRET está configurado
5. **Frontend no carga**: Verificar que `regismac-frontend/dist` se construya correctamente

## 📝 Notas Importantes

- El botón ESP32 está oculto en producción pero el código sigue disponible
- Los usuarios técnicos se corrigen automáticamente al cargar la lista de técnicos
- El sistema de ping automático mantiene el servicio activo en Render (free plan)
- El frontend y backend están en el mismo servicio en Render

