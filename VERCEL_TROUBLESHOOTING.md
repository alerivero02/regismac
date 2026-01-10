# 🔧 Troubleshooting - Error 404 en Vercel

## Problema: No hay logs y aparece 404

Si no ves logs en Vercel y aparece un 404, significa que el build no se está ejecutando correctamente.

## ✅ Checklist de Verificación en Vercel

### 1. Verificar Configuración del Proyecto

Ve a **Settings → General** y verifica:

- ✅ **Root Directory**: Debe ser `Regismac_1.0` (sin barra al final)
- ✅ **Framework Preset**: Debe estar en **"Other"** o vacío
- ✅ **Build Command**: Debe estar **VACÍO** (se usa el de vercel.json)
- ✅ **Output Directory**: Debe estar **VACÍO** (se usa el de vercel.json)
- ✅ **Install Command**: Debe estar **VACÍO** o `npm ci`

### 2. Verificar que el Build se Ejecute

1. Ve a **Deployments**
2. Click en el último deployment
3. Si no hay logs, el problema es que Vercel no está detectando el proyecto correctamente

### 3. Solución: Configuración Manual en Vercel

Si no hay logs, configura manualmente en Vercel:

#### En Settings → General:

```
Root Directory: Regismac_1.0
Framework Preset: Other
Build Command: cd regismac-frontend && npm ci && npm run build
Output Directory: regismac-frontend/dist
Install Command: npm ci
```

#### O mejor aún, elimina vercel.json temporalmente y configura todo manualmente:

1. **Root Directory**: `Regismac_1.0`
2. **Build Command**: `cd regismac-frontend && npm ci && npm run build`
3. **Output Directory**: `regismac-frontend/dist`
4. **Install Command**: `npm ci`

### 4. Verificar Estructura de Archivos

Asegúrate de que la estructura sea:

```
Regismac_1.0/
├── api/
│   └── index.js          ✅ Debe existir
├── regismac-frontend/
│   ├── package.json      ✅ Debe existir
│   └── vite.config.js    ✅ Debe existir
├── regismac-backend/
│   └── ...
├── vercel.json           ✅ Debe existir
└── package.json          ✅ Debe existir
```

### 5. Forzar un Nuevo Deployment

1. En Vercel, ve a **Deployments**
2. Click en los **3 puntos** del último deployment
3. Selecciona **"Redeploy"**
4. Marca **"Use existing Build Cache"** como **NO**
5. Click en **"Redeploy"**

### 6. Verificar Variables de Entorno

Aunque no afecta el build, verifica que tengas configuradas:

- `NODE_ENV=production`
- `DATABASE_URL=...` (para que el backend funcione después)

## 🚨 Solución Rápida: Configuración Mínima

Si nada funciona, prueba esta configuración mínima:

### Opción A: Solo Frontend (para probar)

1. En Vercel Settings → General:
   - Root Directory: `Regismac_1.0/regismac-frontend`
   - Build Command: `npm ci && npm run build`
   - Output Directory: `dist`
   - Framework Preset: Vite

2. Esto debería funcionar inmediatamente y verás logs

### Opción B: Con Backend (configuración completa)

1. En Vercel Settings → General:
   - Root Directory: `Regismac_1.0`
   - Build Command: `cd regismac-frontend && npm ci && npm run build`
   - Output Directory: `regismac-frontend/dist`
   - Install Command: `npm ci`

2. Verifica que el archivo `api/index.js` exista en `Regismac_1.0/api/index.js`

## 📝 Verificar que los Archivos Estén en GitHub

Ejecuta estos comandos para verificar:

```bash
cd Regismac_1.0
ls -la api/
ls -la regismac-frontend/
cat vercel.json
```

Si algún archivo falta, agrégalo y haz push.

## 🔍 Debugging Avanzado

### Verificar Build Localmente

Prueba construir localmente para ver si hay errores:

```bash
cd Regismac_1.0/regismac-frontend
npm ci
npm run build
```

Si esto falla, corrige los errores antes de desplegar.

### Verificar que vercel.json sea Válido

El archivo `vercel.json` debe ser JSON válido. Verifica con:

```bash
cat Regismac_1.0/vercel.json | python -m json.tool
```

O usa un validador JSON online.

## 💡 Próximos Pasos

1. ✅ Verifica la configuración en Vercel (Settings → General)
2. ✅ Fuerza un nuevo deployment sin cache
3. ✅ Si sigue sin logs, prueba la Opción A (solo frontend) primero
4. ✅ Una vez que funcione el frontend, agrega el backend

## 📞 Si Nada Funciona

Comparte:
1. Screenshot de Settings → General en Vercel
2. Screenshot de la pestaña Deployments
3. El contenido de `vercel.json`
4. La estructura de carpetas de `Regismac_1.0`

