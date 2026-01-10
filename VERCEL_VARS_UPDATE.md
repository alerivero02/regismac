# 🔧 Actualizar Variables de Entorno en Vercel

## Variables que DEBES ACTUALIZAR:

### 1. DATABASE_URL
**Actual:** `mysql://root:@localhost:3307/regismac`  
**Cambiar a:**
```
postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### 2. SESSION_SECRET
**Actual:** `dev-secret-key-change-in-production`  
**Cambiar a:**
```
17bd49b512dd4a3bb52025038b15501f9914c352d595ed6f642bbc0f89d97d7b
```

### 3. FRONTEND_URL
**Actual:** `http://localhost:5173`  
**Cambiar a:** `https://TU-URL-VERCEL.vercel.app`  
(Reemplaza TU-URL-VERCEL con tu URL real de Vercel)

### 4. BACKEND_URL
**Actual:** `http://localhost:3000`  
**Cambiar a:** `https://TU-URL-VERCEL.vercel.app`  
(La misma URL que FRONTEND_URL)

## Variables que DEBES AGREGAR:

### 5. JWT_SECRET (NUEVA)
```
89a89e082c6f66aabee5726b619dd3c2541915ea11d4ab0f3824be223b470c0e
```

## Variables que puedes ELIMINAR (no necesarias en producción):

- PORT (Vercel lo maneja automáticamente)
- HOST (Vercel lo maneja automáticamente)
- ENABLE_RATE_LIMIT (opcional, puedes dejarlo en false)

---

## Pasos:

1. En Vercel → Settings → Environment Variables
2. Para cada variable que necesitas cambiar:
   - Click en la variable
   - Click en "Edit"
   - Actualiza el valor
   - Guarda
3. Agrega JWT_SECRET (nueva variable)
4. Marca todas las variables para: Production, Preview, Development
5. Ve a Deployments → Redeploy

---

**✅ Cuando termines, escribe: "VARIABLES ACTUALIZADAS"**
