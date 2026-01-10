# ✅ Configuración Final Completa para Vercel

## Estado Actual
✅ **TODO CONFIGURADO Y LISTO**

## Archivos en la Raíz del Repositorio

### 1. `package.json` (Raíz)
- Package.json mínimo sin dependencias
- Solo define engines de Node.js

### 2. `package-lock.json` (Raíz)
- Lockfile mínimo correspondiente al package.json
- Permite que `npm ci` se ejecute sin errores

### 3. `vercel.json` (Raíz)
- **installCommand**: `cd Regismac_1.0 && npm ci && cd regismac-frontend && npm ci`
  - Instala dependencias del backend
  - Instala dependencias del frontend
- **buildCommand**: `cd Regismac_1.0/regismac-frontend && npm ci && npm run build`
  - Construye el frontend
- **outputDirectory**: `Regismac_1.0/regismac-frontend/dist`
  - Directorio de salida del build
- **functions**: `api/index.js` con timeout de 60s
- **rewrites**: 
  - `/api/*` → `api/index.js` (backend)
  - `/*` → `index.html` (frontend SPA)

### 4. `api/index.js` (Raíz)
- Función serverless que importa el backend desde `Regismac_1.0/regismac-backend/src/app.js`
- Maneja Prisma Client para serverless
- Exporta handler compatible con Vercel

## Configuración en Vercel Dashboard

### Settings → General
- **Root Directory**: (VACÍO - no configurar)
- **Framework Preset**: Other (o vacío)
- **Build Command**: (VACÍO - usa vercel.json)
- **Output Directory**: (VACÍO - usa vercel.json)
- **Install Command**: (VACÍO - usa vercel.json)

### Settings → Git
- **Production Branch**: `main`
- **Git Repository**: Conectado a `alerivero02/Regismac_1.0`

## Variables de Entorno Necesarias

Configura estas en **Settings → Environment Variables**:

```
DATABASE_URL=tu_connection_string_mysql
SESSION_SECRET=tu_secret_key_segura
NODE_ENV=production
```

Y cualquier otra variable que uses en tu `.env` del backend.

## Proceso de Deployment

1. Vercel clona el repositorio
2. Ejecuta `npm ci` en la raíz (sin errores gracias a package-lock.json)
3. Ejecuta `installCommand`: instala dependencias del backend y frontend
4. Ejecuta `buildCommand`: construye el frontend
5. Despliega:
   - Frontend estático desde `Regismac_1.0/regismac-frontend/dist`
   - Backend como función serverless en `api/index.js`

## Verificación

Después del deployment, verifica:
- ✅ Frontend carga correctamente
- ✅ Las rutas `/api/*` funcionan
- ✅ La base de datos se conecta correctamente
- ✅ Las variables de entorno están configuradas

## Si Algo Falla

1. Verifica los logs en **Deployments → Build Logs**
2. Verifica que las variables de entorno estén configuradas
3. Verifica que `DATABASE_URL` sea accesible desde Vercel
4. Verifica que Prisma pueda conectarse a la base de datos

## Estado Final

🎉 **TODO ESTÁ CONFIGURADO Y LISTO PARA DESPLEGAR**

Solo necesitas:
1. Configurar las variables de entorno en Vercel
2. Hacer un deployment (automático o manual)
3. Verificar que todo funcione

