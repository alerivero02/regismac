# 🔍 Verificación de Servicios de Login - RegisMAC (PRODUCCIÓN)

## Servicios que Necesitan Verificarse

### 1. Backend API (Producción en Vercel)

#### Endpoints de Autenticación:
- **GET** `https://regismac.vercel.app/api/auth/me` - Verificar usuario actual
- **POST** `https://regismac.vercel.app/api/usuarios/login` - Login con email/password
- **GET** `https://regismac.vercel.app/api/auth/google` - Iniciar login con Google OAuth
- **GET** `https://regismac.vercel.app/api/auth/google/callback` - Callback de Google OAuth
- **POST** `https://regismac.vercel.app/api/auth/logout` - Cerrar sesión

### 2. Frontend (Producción en Vercel)

- **GET** `https://regismac.vercel.app/login` - Página de login
- **GET** `https://regismac.vercel.app/` - Dashboard (requiere autenticación)

### 3. Servicios Externos

#### Google OAuth:
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials
- Verificar que existan:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - URLs autorizadas configuradas correctamente

### 4. Base de Datos

- Verificar que MySQL/Prisma esté corriendo
- Verificar conexión a la base de datos
- Verificar que exista la tabla `usuarios`

## Checklist de Verificación

### ✅ Backend (Producción)
- [ ] Deploy en Vercel activo y funcionando
- [ ] Endpoint `https://regismac.vercel.app/api/auth/me` responde correctamente
- [ ] Endpoint `https://regismac.vercel.app/api/usuarios/login` funciona
- [ ] Endpoint `https://regismac.vercel.app/api/auth/google` redirige a Google
- [ ] Variables de entorno en Vercel configuradas:
  - [ ] `SESSION_SECRET` (no debe ser el valor de desarrollo)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `BACKEND_URL` = `https://regismac.vercel.app`
  - [ ] `FRONTEND_URL` = `https://regismac.vercel.app`
  - [ ] `DATABASE_URL` (base de datos de producción)
  - [ ] `NODE_ENV` = `production`
  - [ ] `JWT_SECRET` (si se usa)

### ✅ Frontend (Producción)
- [ ] Deploy en Vercel activo y funcionando
- [ ] Página `https://regismac.vercel.app/login` carga correctamente
- [ ] Formulario de login funciona
- [ ] Botón de Google OAuth funciona
- [ ] Redirección después de login funciona
- [ ] No hay errores en la consola del navegador

### ✅ Google OAuth
- [ ] Credenciales configuradas en Google Cloud Console
- [ ] Redirect URI configurado: `https://regismac.vercel.app/api/auth/google/callback` (producción)
- [ ] JavaScript origins autorizados: `https://regismac.vercel.app`
- [ ] `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` configurados en Vercel
- [ ] Tipo de aplicación: "Web application" (no "Desktop app")

### ✅ Base de Datos (Producción)
- [ ] Base de datos de producción configurada (Neon/PostgreSQL)
- [ ] `DATABASE_URL` configurada en Vercel con conexión SSL
- [ ] Migraciones aplicadas en producción (`npx prisma migrate deploy`)
- [ ] Tabla `usuarios` existe en la base de datos
- [ ] Conexión a la base de datos funciona desde Vercel

## URLs para Verificar en el Navegador (PRODUCCIÓN)

1. **Frontend Login**: https://regismac.vercel.app/login
2. **Backend Health Check**: https://regismac.vercel.app/api/auth/me
3. **Google OAuth Config**: https://console.cloud.google.com/apis/credentials
4. **Vercel Environment Variables**: https://vercel.com/alexanders-projects-678c1206/regismac/settings/environment-variables
5. **Vercel Deployments**: https://vercel.com/alexanders-projects-678c1206/regismac/deployments
6. **Vercel Logs**: https://vercel.com/alexanders-projects-678c1206/regismac/logs

## Checklist de Verificación Rápida

### 1. Verificar Variables de Entorno en Vercel
- [ ] Ir a: https://vercel.com/alexanders-projects-678c1206/regismac/settings/environment-variables
- [ ] Verificar que todas las variables estén configuradas para **Production**
- [ ] Verificar que `FRONTEND_URL` y `BACKEND_URL` apunten a `https://regismac.vercel.app`

### 2. Verificar Google OAuth
- [ ] Ir a: https://console.cloud.google.com/apis/credentials
- [ ] Verificar que el Redirect URI incluya: `https://regismac.vercel.app/api/auth/google/callback`
- [ ] Verificar que JavaScript origins incluya: `https://regismac.vercel.app`

### 3. Verificar Deploy en Vercel
- [ ] Ir a: https://vercel.com/alexanders-projects-678c1206/regismac/deployments
- [ ] Verificar que el último deploy esté en estado **Ready**
- [ ] Si hay errores, revisar los logs

### 4. Probar Endpoints en Producción
- [ ] Abrir: https://regismac.vercel.app/login
- [ ] Verificar que la página carga sin errores
- [ ] Probar login con email/password
- [ ] Probar login con Google OAuth
- [ ] Verificar redirección al dashboard después del login

## Notas Importantes

- **NO** se deben iniciar servicios locales para producción
- Todas las verificaciones deben hacerse en las URLs de producción
- Si hay errores, revisar los logs de Vercel
- El callback URL de Google debe ser exactamente: `https://regismac.vercel.app/api/auth/google/callback`
- Las variables de entorno deben estar configuradas para el entorno **Production** en Vercel
