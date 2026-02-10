# 🚂 Guía de Migración de Render a Railway

## ¿Por qué Railway?

- ✅ **GRATIS** con $5 de crédito mensual (suficiente para tu app)
- ✅ **SIN SLEEP** - El servicio siempre está activo
- ✅ **Sin timeouts** - No más errores de "10 segundos"
- ✅ **Muy fácil** - Similar a Render, solo conectas GitHub
- ✅ **PostgreSQL incluido** - Base de datos gratis

## 📋 Paso 1: Crear cuenta en Railway

1. Ve a https://railway.app
2. Click en **"Start a New Project"**
3. Conecta tu cuenta de **GitHub**
4. Autoriza Railway a acceder a tu repositorio

## 📋 Paso 2: Crear nuevo proyecto

1. En Railway Dashboard, click **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Elige tu repositorio **regismac**
4. Railway detectará automáticamente que es Node.js

## 📋 Paso 3: Configurar el servicio

Railway detectará automáticamente:
- ✅ `railway.json` (ya creado)
- ✅ `nixpacks.toml` (configuración de build)
- ✅ `package.json` con scripts
- ✅ Puerto automático (no necesitas configurar PORT)

**⚠️ IMPORTANTE:** Si Railway usa `npm ci` y da error, el archivo `nixpacks.toml` fuerza el uso de `npm install` para evitar problemas de sincronización del lock file.

### Variables de Entorno

Ve a **Settings → Variables** y agrega todas las variables que tenías en Render:

```
NODE_ENV=production
DATABASE_URL=tu_connection_string_de_postgresql
SESSION_SECRET=tu_secret_generado
FRONTEND_URL=https://tu-proyecto.railway.app
BACKEND_URL=https://tu-proyecto.railway.app
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
```

**⚠️ IMPORTANTE:** 
- `FRONTEND_URL` y `BACKEND_URL` las actualizarás DESPUÉS del primer deploy con la URL real que Railway te dé
- Railway te dará una URL como: `regismac-production.up.railway.app`

## 📋 Paso 4: Base de datos PostgreSQL

Railway ofrece PostgreSQL gratis:

1. En tu proyecto Railway, click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway creará automáticamente la variable `DATABASE_URL`
3. **¡Listo!** No necesitas configurar nada más

## 📋 Paso 5: Ejecutar migraciones

Una vez que Railway haya hecho el primer deploy:

1. Ve a tu proyecto en Railway
2. Click en el servicio (no la base de datos)
3. Ve a **"Deployments"** → Click en el último deploy
4. Click en **"View Logs"**
5. Busca si hay errores de Prisma

Si necesitas ejecutar migraciones manualmente:

```bash
# En Railway, ve a la terminal del servicio
railway run npx prisma migrate deploy
```

O desde tu máquina local (si tienes Railway CLI):

```bash
railway link  # Conecta a tu proyecto
cd regismac-backend
railway run npx prisma migrate deploy
```

## 📋 Paso 6: Actualizar URLs

Después del primer deploy:

1. Railway te dará una URL como: `regismac-production.up.railway.app`
2. Ve a **Settings → Variables**
3. Actualiza:
   - `FRONTEND_URL=https://regismac-production.up.railway.app`
   - `BACKEND_URL=https://regismac-production.up.railway.app`
4. Haz **redeploy** del servicio

## 📋 Paso 7: Dominio personalizado (Opcional)

Si quieres usar tu propio dominio:

1. Ve a **Settings → Networking**
2. Click **"Generate Domain"** (Railway te da uno gratis)
3. O agrega tu dominio personalizado

## ✅ Verificación

Después del deploy, verifica:

1. ✅ El servicio está activo (Status: Active)
2. ✅ No hay errores en los logs
3. ✅ La URL funciona: `https://tu-url.railway.app`
4. ✅ `/api/health` responde correctamente
5. ✅ El frontend carga correctamente
6. ✅ Los sensores ESP32 pueden enviar datos

## 💰 Costos

- **Gratis:** $5 de crédito mensual
- **Tu app:** ~$0-2/mes (depende del uso)
- **Total:** **GRATIS** o máximo **$2-3/mes** si superas el crédito

## 🔄 Migrar desde Render

1. **NO elimines Render todavía** - Déjalo funcionando mientras migras
2. Configura Railway con las mismas variables de entorno
3. Prueba que todo funcione en Railway
4. Actualiza tus ESP32 con la nueva URL de Railway
5. Una vez confirmado, puedes eliminar Render

## 🆘 Troubleshooting

### Error: "Prisma Client not generated"
```bash
# En Railway terminal o local con Railway CLI
railway run npx prisma generate
```

### Error: "Database connection failed"
- Verifica que `DATABASE_URL` esté configurada
- Verifica que la base de datos esté activa en Railway

### Error: "Port already in use"
- Railway maneja el puerto automáticamente
- NO configures `PORT` manualmente, Railway lo hace por ti

### El servicio se reinicia constantemente
- Revisa los logs en Railway
- Verifica que `npm start` funcione correctamente
- Asegúrate de que Prisma Client esté generado

## 📚 Recursos

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

---

**¿Necesitas ayuda?** Railway tiene excelente soporte y documentación. El proceso es muy similar a Render pero sin el problema del sleep.
