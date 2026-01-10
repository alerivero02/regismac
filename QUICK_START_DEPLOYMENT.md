# ⚡ Inicio Rápido - Deployment de RegisMAC

Esta es una guía rápida para publicar tu aplicación en internet en menos de 30 minutos.

## 🎯 Pasos Rápidos

### 1. Base de Datos (5 minutos)

**Opción A: PlanetScale (MySQL - Recomendado)**

1. Ve a https://planetscale.com y crea cuenta
2. Crea una base de datos llamada `regismac`
3. Copia el connection string (formato: `mysql://...`)

**Opción B: Neon (PostgreSQL)**

1. Ve a https://neon.tech y crea cuenta
2. Crea un proyecto llamado `regismac`
3. Copia el connection string (formato: `postgresql://...`)
4. Si usas PostgreSQL, cambia en `regismac-backend/prisma/schema.prisma`:
   ```prisma
   provider = "postgresql"  // en lugar de "mysql"
   ```

### 2. GitHub (3 minutos)

```bash
# Si no tienes Git inicializado
git init
git add .
git commit -m "Initial commit: RegisMAC"

# Crear repositorio en GitHub (ve a github.com y crea uno nuevo)
# Luego conecta:
git remote add origin https://github.com/TU_USUARIO/regismac.git
git branch -M main
git push -u origin main
```

### 3. Vercel (5 minutos)

1. Ve a https://vercel.com y crea cuenta (con GitHub)
2. Click en "Add New Project"
3. Selecciona tu repositorio `regismac`
4. **DEJA TODO VACÍO** (vercel.json maneja todo)
5. Click en "Deploy"

### 4. Variables de Entorno (5 minutos)

1. En Vercel, ve a **Settings** → **Environment Variables**
2. Genera secrets:
   ```bash
   node scripts/generate-secrets.js
   ```
3. Agrega estas variables en Vercel:

```
NODE_ENV=production
DATABASE_URL=tu_connection_string_de_planetscale_o_neon
SESSION_SECRET=valor_generado_arriba
JWT_SECRET=valor_generado_arriba
FRONTEND_URL=https://tu-proyecto.vercel.app
BACKEND_URL=https://tu-proyecto.vercel.app
```

**⚠️ IMPORTANTE**: Agrega `FRONTEND_URL` y `BACKEND_URL` DESPUÉS del primer deploy (cuando tengas la URL de Vercel).

### 5. Migraciones (2 minutos)

```bash
cd regismac-backend
# Configura DATABASE_URL temporalmente
echo "DATABASE_URL=tu_connection_string" > .env.production
npx prisma migrate deploy
```

### 6. Redeploy (1 minuto)

1. En Vercel, ve a **Deployments**
2. Click en los 3 puntos del último deployment
3. Click en "Redeploy"
4. Espera a que termine

### 7. Actualizar URLs (1 minuto)

1. Copia la URL de Vercel (ej: `regismac.vercel.app`)
2. Ve a **Settings** → **Environment Variables**
3. Actualiza:
   - `FRONTEND_URL=https://regismac.vercel.app`
   - `BACKEND_URL=https://regismac.vercel.app`
4. Haz otro redeploy

## ✅ ¡Listo!

Tu aplicación debería estar funcionando en `https://tu-proyecto.vercel.app`

## 🔧 Scripts Útiles

```bash
# Generar secrets
npm run generate-secrets

# Hacer deployment (Windows)
.\scripts\deploy.ps1

# Hacer deployment (Linux/Mac)
bash scripts/deploy.sh
```

## 📚 Documentación Completa

Para más detalles, consulta [DEPLOYMENT_COMPLETO.md](./DEPLOYMENT_COMPLETO.md)
