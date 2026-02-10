# 🔧 Solución al Error de Railway: npm ci

## Problema

Railway está intentando usar `npm ci` pero el `package-lock.json` no está sincronizado con `package.json`, causando este error:

```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
```

## Solución Aplicada

He creado dos archivos de configuración:

### 1. `nixpacks.toml`
Este archivo fuerza a Railway a usar `npm install` en lugar de `npm ci`:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npm run build:render"]

[start]
cmd = "npm start"
```

### 2. `railway.json` actualizado
El buildCommand ahora usa `npm install` explícitamente:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build:render"
  }
}
```

## Pasos para Resolver

1. **Asegúrate de que los archivos estén en el repositorio:**
   ```bash
   git add nixpacks.toml railway.json package-lock.json
   git commit -m "fix: configurar Railway para usar npm install"
   git push
   ```

2. **En Railway:**
   - Ve a tu proyecto
   - Click en **"Settings"** → **"Deploy"**
   - Verifica que el buildCommand sea: `npm install && npm run build:render`
   - O simplemente haz **redeploy** y Railway usará los archivos de configuración

3. **Si el error persiste:**
   - Ve a **Settings** → **"Build & Deploy"**
   - En **"Build Command"**, cambia manualmente a: `npm install && npm run build:render`
   - En **"Start Command"**, asegúrate de que sea: `npm start`

## Alternativa: Actualizar package-lock.json

Si prefieres mantener `npm ci`, actualiza el lock file:

```bash
# En tu máquina local
cd regismac
npm install
git add package-lock.json
git commit -m "fix: actualizar package-lock.json"
git push
```

Luego Railway podrá usar `npm ci` correctamente.

## Verificación

Después del deploy, verifica en los logs de Railway:
- ✅ Debe decir: `npm install` (no `npm ci`)
- ✅ Debe ejecutar: `npm run build:render`
- ✅ Debe iniciar con: `npm start`

---

**Nota:** La solución con `nixpacks.toml` es más robusta porque fuerza el comportamiento deseado independientemente de la configuración de Railway.
