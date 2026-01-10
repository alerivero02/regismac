# 🚀 Guía Completa de Deployment - RegisMAC

Esta guía te llevará paso a paso para publicar tu aplicación RegisMAC en internet.

## 📋 Índice

1. [Configuración de Base de Datos](#1-configuración-de-base-de-datos)
2. [Configuración de Git](#2-configuración-de-git)
3. [Configuración de Vercel](#3-configuración-de-vercel)
4. [Variables de Entorno](#4-variables-de-entorno)
5. [Migración de Base de Datos](#5-migración-de-base-de-datos)
6. [Deployment Final](#6-deployment-final)

---

## 1. Configuración de Base de Datos

### Opción A: PlanetScale (MySQL - Recomendado)

PlanetScale es compatible con MySQL y es perfecto para Prisma.

#### Pasos:

1. **Crear cuenta en PlanetScale**
   - Ve a https://planetscale.com
   - Crea una cuenta gratuita (hasta 5GB gratis)
   - Verifica tu email

2. **Crear una base de datos**
   - Click en "Create database"
   - Nombre: `regismac`
   - Region: Elige la más cercana (ej: `us-east`)
   - Plan: Free (Development)
   - Click en "Create database"

3. **Obtener connection string**
   - Ve a tu base de datos
   - Click en "Connect"
   - Selecciona "Prisma" como cliente
   - Copia el connection string (formato: `mysql://...`)

4. **Actualizar schema de Prisma (si es necesario)**
   - PlanetScale usa MySQL, así que tu schema actual debería funcionar
   - Si necesitas cambiar algo, edita `regismac-backend/prisma/schema.prisma`

### Opción B: Neon (PostgreSQL)

Si prefieres PostgreSQL, Neon es una excelente opción.

#### Pasos:

1. **Crear cuenta en Neon**
   - Ve a https://neon.tech
   - Crea una cuenta gratuita
   - Verifica tu email

2. **Crear un proyecto**
   - Click en "Create Project"
   - Nombre: `regismac`
   - Region: Elige la más cercana
   - PostgreSQL version: 15 o superior
   - Click en "Create project"

3. **Obtener connection string**
   - En el dashboard, ve a "Connection Details"
   - Copia el connection string (formato: `postgresql://...`)

4. **Actualizar schema de Prisma**
   - Cambia `provider = "mysql"` a `provider = "postgresql"` en `regismac-backend/prisma/schema.prisma`
   - Ejecuta: `cd regismac-backend && npx prisma migrate dev --name init`

---

## 2. Configuración de Git

### Paso 1: Inicializar repositorio (si no está inicializado)

```bash
cd C:\Users\Administrator\Desktop\Portfolio\Regismac_local
git init
```

### Paso 2: Agregar todos los archivos

```bash
git add .
git commit -m "feat: Initial commit - RegisMAC application"
```

### Paso 3: Crear repositorio en GitHub

1. Ve a https://github.com
2. Click en "New repository"
3. Nombre: `regismac` (o el que prefieras)
4. Descripción: "Sistema de gestión de producción RegisMAC"
5. **NO** marques "Initialize with README" (ya tienes archivos)
6. Click en "Create repository"

### Paso 4: Conectar repositorio local con GitHub

```bash
git remote add origin https://github.com/TU_USUARIO/regismac.git
git branch -M main
git push -u origin main
```

**Nota**: Reemplaza `TU_USUARIO` con tu usuario de GitHub.

---

## 3. Configuración de Vercel

### Paso 1: Crear cuenta en Vercel

1. Ve a https://vercel.com
2. Click en "Sign Up"
3. Selecciona "Continue with GitHub"
4. Autoriza Vercel para acceder a tus repositorios

### Paso 2: Importar proyecto

1. En el dashboard de Vercel, click en "Add New Project"
2. Selecciona el repositorio `regismac` que acabas de crear
3. Click en "Import"

### Paso 3: Configuración del proyecto

**⚠️ IMPORTANTE**: Deja estos campos **VACÍOS** (el `vercel.json` maneja todo):

- **Root Directory**: (vacío)
- **Framework Preset**: Other
- **Build Command**: (vacío)
- **Output Directory**: (vacío)
- **Install Command**: (vacío)

Click en "Deploy" (por ahora, sin variables de entorno - las agregaremos después)

---

## 4. Variables de Entorno

### Paso 1: Generar secrets seguros

Ejecuta estos comandos para generar secrets seguros:

```bash
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copia los valores generados.

### Paso 2: Configurar variables en Vercel

1. Ve a tu proyecto en Vercel
2. Click en **Settings** → **Environment Variables**
3. Agrega las siguientes variables:

#### Variables Requeridas:

```env
# Entorno
NODE_ENV=production

# Base de Datos (usa el connection string de PlanetScale o Neon)
DATABASE_URL=mysql://usuario:password@host:puerto/database
# O si usas PostgreSQL:
# DATABASE_URL=postgresql://usuario:password@host:puerto/database?sslmode=require

# Seguridad (usa los valores generados arriba)
SESSION_SECRET=tu_session_secret_generado
JWT_SECRET=tu_jwt_secret_generado

# URLs
FRONTEND_URL=https://tu-proyecto.vercel.app
BACKEND_URL=https://tu-proyecto.vercel.app
```

#### Variables Opcionales (si las usas):

```env
# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Google Drive
GOOGLE_DRIVE_FOLDER_ID=tu_folder_id

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password

# Rate Limiting
ENABLE_RATE_LIMIT=true
```

**⚠️ IMPORTANTE**: 
- Marca todas las variables para **Production**, **Preview** y **Development**
- **NO** agregues `FRONTEND_URL` y `BACKEND_URL` todavía - las agregarás después del primer deploy

### Paso 3: Actualizar URLs después del primer deploy

1. Después del primer deploy exitoso, Vercel te dará una URL (ej: `regismac.vercel.app`)
2. Ve a **Settings** → **Environment Variables**
3. Actualiza:
   - `FRONTEND_URL=https://regismac.vercel.app`
   - `BACKEND_URL=https://regismac.vercel.app`
4. Haz un redeploy

---

## 5. Migración de Base de Datos

### Paso 1: Ejecutar migraciones

Después de configurar `DATABASE_URL` en Vercel, ejecuta las migraciones:

**Opción A: Desde tu máquina local**

```bash
cd regismac-backend
# Configura DATABASE_URL en un archivo .env temporal
echo "DATABASE_URL=tu_connection_string_de_produccion" > .env.production
npx prisma migrate deploy
```

**Opción B: Usando Vercel CLI**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Link proyecto
vercel link

# Ejecutar migraciones en producción
cd regismac-backend
vercel env pull .env.production
npx prisma migrate deploy
```

### Paso 2: Verificar migraciones

```bash
cd regismac-backend
npx prisma studio
```

Esto abrirá Prisma Studio donde puedes verificar que las tablas se crearon correctamente.

---

## 6. Deployment Final

### Paso 1: Hacer commit y push de todos los cambios

```bash
git add .
git commit -m "feat: Configuración completa para producción"
git push origin main
```

### Paso 2: Vercel desplegará automáticamente

Vercel detectará el push y comenzará el deployment automáticamente.

### Paso 3: Verificar deployment

1. Ve a **Deployments** en Vercel
2. Espera a que termine el build
3. Si hay errores, revisa los logs
4. Click en el deployment para ver la URL

### Paso 4: Probar la aplicación

1. Abre la URL de Vercel
2. Verifica que el frontend carga correctamente
3. Intenta hacer login
4. Verifica que las APIs funcionan

---

## 🔧 Troubleshooting

### Error: "Cannot find module"

**Solución**: Verifica que `installCommand` en `vercel.json` instala todas las dependencias.

### Error: "Prisma Client not generated"

**Solución**: El script `vercel-build` debe ejecutar `npx prisma generate` antes del build.

### Error: "Database connection failed"

**Solución**: 
1. Verifica que `DATABASE_URL` está correctamente configurada
2. Verifica que la base de datos permite conexiones externas
3. Si usas PlanetScale, verifica que el branch está activo

### Error: "404 on API routes"

**Solución**: Verifica que `vercel.json` tiene los rewrites correctos para `/api/*`.

---

## 📝 Checklist Final

- [ ] Base de datos creada y connection string obtenido
- [ ] Repositorio Git inicializado y conectado a GitHub
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] Migraciones ejecutadas en la base de datos de producción
- [ ] Primer deployment exitoso
- [ ] URLs actualizadas después del primer deploy
- [ ] Aplicación probada y funcionando

---

## 🎉 ¡Listo!

Tu aplicación RegisMAC debería estar funcionando en internet. Si tienes algún problema, revisa la sección de Troubleshooting o los logs de Vercel.
