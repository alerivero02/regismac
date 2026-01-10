# Variables de Entorno para Vercel

## Instrucciones para actualizar en Vercel Dashboard

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `regismac`
3. Ve a **Settings** → **Environment Variables**
4. Actualiza o crea las siguientes variables:

### Variables a Actualizar/Crear:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | Connection string de Neon PostgreSQL |
| `SESSION_SECRET` | `17bd49b512dd4a3bb52025038b15501f9914c352d595ed6f642bbc0f89d97d7b` | Secret para sesiones (generado) |
| `JWT_SECRET` | `89a89e082c6f66aabee5726b619dd3c2541915ea11d4ab0f3824be223b470c0e` | Secret para JWT (generado) |
| `NODE_ENV` | `production` | Entorno de producción |
| `PORT` | `3000` | Puerto del servidor |
| `HOST` | `0.0.0.0` | Host del servidor |
| `FRONTEND_URL` | `https://regismac.vercel.app` | URL del frontend en producción |
| `BACKEND_URL` | `https://regismac.vercel.app` | URL del backend (mismo dominio, APIs en /api) |
| `ENABLE_RATE_LIMIT` | `false` | Desactivar rate limiting en producción |

### Importante:
- Asegúrate de que todas las variables estén configuradas para el entorno **Production**
- Después de actualizar, Vercel hará un nuevo deploy automáticamente
- El deploy puede tardar unos minutos
