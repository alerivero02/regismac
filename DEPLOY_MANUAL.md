# 🚀 Deployment Manual con Brave

## ⚠️ IMPORTANTE
Usa **Brave** manualmente. Yo te guiaré paso a paso.

---

## PASO 1: NEON DATABASE

### 1.1 Crear cuenta
1. Abre Brave
2. Ve a: **https://console.neon.tech/signup**
3. Haz clic en **"GitHub"**
4. Inicia sesión en GitHub
5. Autoriza Neon

### 1.2 Crear proyecto
Cuando veas el dashboard de Neon:
1. Haz clic en **"Create a project"**
2. Nombre: `regismac`
3. Region: Elige la más cercana (ej: `us-east-1`)
4. Haz clic en **"Create project"**

### 1.3 Obtener connection string
1. En el proyecto, ve a **"Connection Details"**
2. Copia el connection string (formato: `postgresql://...`)
3. **Guárdalo** - lo necesitaremos para Vercel

**✅ Cuando termines, escribe "NEON LISTO"**

---

## PASO 2: GITHUB REPOSITORIO

### 2.1 Crear repositorio
1. En Brave, ve a: **https://github.com/new**
2. Nombre: `regismac`
3. **NO** marques "Initialize with README"
4. Haz clic en **"Create repository"**

### 2.2 Push del código
En tu terminal (PowerShell):
```powershell
cd C:\Users\Administrator\Desktop\Portfolio\Regismac_local
git remote add origin https://github.com/TU_USUARIO/regismac.git
git branch -M main
git push -u origin main
```
(Reemplaza `TU_USUARIO` con tu usuario de GitHub)

**✅ Cuando termines, escribe "GITHUB LISTO"**

---

## PASO 3: VERCEL

### 3.1 Crear cuenta
1. En Brave, ve a: **https://vercel.com**
2. Haz clic en **"Sign Up"** → **"Continue with GitHub"**
3. Autoriza Vercel

### 3.2 Importar proyecto
1. Haz clic en **"Add New Project"**
2. Selecciona el repositorio `regismac`
3. **⚠️ DEJA TODO VACÍO:**
   - Root Directory: (vacío)
   - Framework Preset: Other
   - Build Command: (vacío)
   - Output Directory: (vacío)
4. Haz clic en **"Deploy"**

**✅ Cuando termines, escribe "VERCEL DEPLOY"**

---

## PASO 4: VARIABLES DE ENTORNO

1. En Vercel, ve a **Settings** → **Environment Variables**
2. Agrega estas variables (marca todas: Production, Preview, Development):

```
NODE_ENV=production
DATABASE_URL=tu_connection_string_de_neon
SESSION_SECRET=17bd49b512dd4a3bb52025038b15501f9914c352d595ed6f642bbc0f89d97d7b
JWT_SECRET=89a89e082c6f66aabee5726b619dd3c2541915ea11d4ab0f3824be223b470c0e
```

**⚠️ NO agregues FRONTEND_URL y BACKEND_URL todavía**

**✅ Cuando termines, escribe "VARIABLES LISTO"**

---

## PASO 5: MIGRACIONES

En tu terminal:
```powershell
cd C:\Users\Administrator\Desktop\Portfolio\Regismac_local\regismac-backend
echo "DATABASE_URL=tu_connection_string_de_neon" > .env.production
npx prisma migrate deploy
```

**✅ Cuando termines, escribe "MIGRACIONES LISTO"**

---

## PASO 6: ACTUALIZAR URLs

1. En Vercel, copia la URL de tu proyecto (ej: `regismac.vercel.app`)
2. Ve a **Settings** → **Environment Variables**
3. Agrega:
```
FRONTEND_URL=https://tu-proyecto.vercel.app
BACKEND_URL=https://tu-proyecto.vercel.app
```
4. Ve a **Deployments** → Click en 3 puntos → **Redeploy**

**✅ Cuando termines, escribe "DEPLOYMENT COMPLETO"**

---

## 🎉 ¡LISTO!

Tu aplicación estará funcionando en `https://tu-proyecto.vercel.app`
