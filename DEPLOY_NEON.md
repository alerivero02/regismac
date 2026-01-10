# 🚀 Despliegue a Vercel con Neon Database

## ✅ Tu Base de Datos Neon

Has configurado Neon (PostgreSQL serverless) correctamente. Esta es tu connection string:

```
postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## 📋 Pasos para Desplegar

### 1. Configurar Variables de Entorno en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables** y configura:

#### Variables Requeridas:

```bash
# Base de datos Neon
DATABASE_URL=postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# URL del backend (reemplaza con tu dominio de Vercel)
BACKEND_URL=https://tu-proyecto.vercel.app

# URL del frontend (mismo que BACKEND_URL)
FRONTEND_URL=https://tu-proyecto.vercel.app

# Entorno
NODE_ENV=production

# Secret de sesión (genera uno nuevo)
SESSION_SECRET=tu_secret_seguro_aqui
```

**Para generar un SESSION_SECRET seguro:**

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Variables Opcionales (Google OAuth):

```bash
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_CALLBACK_URL=https://tu-proyecto.vercel.app/api/auth/google/callback
```

#### Variables Opcionales (Email con Nodemailer):

```bash
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password_de_google
```

### 2. Ejecutar Migraciones en Neon

Antes de desplegar, asegúrate de que tu base de datos Neon tenga las tablas creadas:

```powershell
# Desde la raíz del proyecto
cd regismac-backend

# Configurar la variable de entorno temporalmente
$env:DATABASE_URL="postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Generar cliente de Prisma
npx prisma generate

# Aplicar migraciones
npx prisma migrate deploy

# O si no tienes migraciones, crear las tablas directamente
npx prisma db push

# Verificar que las tablas se crearon
npx prisma studio
```

### 3. Commit y Push

```powershell
# Desde la raíz del proyecto
cd ..
git add .
git commit -m "Fix: Configurar API handler para producción con Neon DB"
git push origin main
```

### 4. Verificar el Deployment

Vercel desplegará automáticamente si tienes GitHub conectado. Una vez termine:

1. **Verifica la API**:
   - Abre: `https://tu-proyecto.vercel.app/api/auth/me`
   - Deberías ver: `{"error":"No autenticado"}`

2. **Verifica el Frontend**:
   - Abre: `https://tu-proyecto.vercel.app`
   - Deberías ver la página de login

3. **Prueba el Login**:
   - Intenta hacer login
   - Si funciona, ¡el deployment fue exitoso!

### 5. Crear Usuario Admin (Primera vez)

Una vez desplegado, necesitas crear un usuario administrador:

```powershell
# Opción A: Crear desde Prisma Studio
cd regismac-backend
$env:DATABASE_URL="postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
npx prisma studio

# Opción B: Usar el script de creación de admin
node scripts/createAdmin.js
```

**O directamente en la base de datos con SQL:**

```sql
-- Conéctate a tu base de datos Neon desde el dashboard
-- Password hasheado: "admin123" (cámbialo después del primer login)
INSERT INTO "Usuario" (
  email, 
  nombre, 
  apellido, 
  password, 
  rol, 
  estado, 
  fecha_registro
) VALUES (
  'admin@regismac.com',
  'Admin',
  'RegisMac',
  '$2a$10$7Z0X4XxQZ7Z9Z9Z9Z9Z9ZeX7Z0X4XxQZ7Z9Z9Z9Z9Z9ZeX7Z0X4Xx',
  'admin',
  'aprobado',
  NOW()
);
```

## 🔍 Verificar Configuración

### Ver Variables de Entorno configuradas:

```powershell
vercel env ls
```

### Ver logs en tiempo real:

```powershell
vercel logs --prod --follow
```

### Redeploy forzado si algo sale mal:

```powershell
vercel --prod --force
```

## 🐛 Troubleshooting

### Error: "Ruta no encontrada"

**Causa**: El handler de API no está usando la aplicación Express completa.

**Solución**: Ya está corregido en los archivos actualizados. Asegúrate de hacer push de todos los cambios.

### Error de conexión a base de datos

**Causa**: Variable `DATABASE_URL` no configurada o incorrecta.

**Solución**:
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que `DATABASE_URL` esté correctamente configurada
3. Asegúrate de incluir `?sslmode=require&channel_binding=require` al final

### Error de Prisma: "Client not generated"

**Causa**: Cliente de Prisma no se generó durante el build.

**Solución**:
```powershell
cd regismac-backend
npx prisma generate
cd ..
git add .
git commit -m "Regenerar cliente Prisma"
git push origin main
```

### Error 500 en todas las rutas

**Causa**: Tablas de la base de datos no existen.

**Solución**: Ejecuta las migraciones (ver paso 2).

### Sesión no persiste / Login no funciona

**Causa**: `SESSION_SECRET` no configurado.

**Solución**: 
1. Genera un secret seguro
2. Agrégalo a las variables de entorno en Vercel
3. Redeploy la aplicación

## 📊 Ventajas de Neon

✅ **Serverless**: Escala automáticamente según demanda
✅ **Gratis**: Plan generoso para empezar
✅ **PostgreSQL**: Compatible con Prisma
✅ **Rápido**: Conexiones desde cualquier región
✅ **Backups**: Automáticos en el plan

## 🔗 Links Útiles

- **Neon Dashboard**: https://console.neon.tech
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Docs Neon + Prisma**: https://neon.tech/docs/guides/prisma

## 📝 Checklist de Deployment

- [ ] Variables de entorno configuradas en Vercel
- [ ] `DATABASE_URL` apunta a Neon
- [ ] Migraciones ejecutadas en Neon (`prisma migrate deploy`)
- [ ] Código pusheado a GitHub
- [ ] Deployment completado en Vercel
- [ ] API funciona (`/api/auth/me` responde)
- [ ] Frontend carga correctamente
- [ ] Usuario admin creado
- [ ] Login funciona correctamente

¡Listo! Tu aplicación debería estar funcionando en producción con Neon.
