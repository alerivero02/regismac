# 🔐 Variables de Entorno para Vercel

## Paso 4: Configurar Variables de Entorno

1. En Vercel, ve a tu proyecto
2. Click en **Settings** → **Environment Variables**
3. Agrega estas variables (marca todas: Production, Preview, Development):

### Variables Requeridas:

```
NODE_ENV=production
```

```
DATABASE_URL=postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

```
SESSION_SECRET=17bd49b512dd4a3bb52025038b15501f9914c352d595ed6f642bbc0f89d97d7b
```

```
JWT_SECRET=89a89e082c6f66aabee5726b619dd3c2541915ea11d4ab0f3824be223b470c0e
```

**⚠️ IMPORTANTE**: NO agregues `FRONTEND_URL` y `BACKEND_URL` todavía (las agregaremos después)

4. Guarda todas las variables

---

**✅ Cuando hayas agregado todas las variables, escribe: "VARIABLES LISTO"**
