# 🔧 Solución: Railway Detecta package-lock.json como Config File

## ⚠️ Problema Detectado

Railway está identificando `/regismac-backend/package-lock.json` como el "Railway Config File" en lugar de usar `railway.json`. Esto significa que Railway está configurado con **Root Directory** apuntando a `regismac-backend/`.

## ✅ Soluciones (Elige una)

### Opción 1: Cambiar Root Directory en Railway (RECOMENDADO) ⭐

**Esta es la mejor solución** - Railway debe usar la raíz del proyecto:

1. Ve a Railway Dashboard → Tu servicio
2. Click en **"Settings"**
3. Scroll hasta **"Root Directory"**
4. Cambia de `regismac-backend` a `.` (punto) o déjalo vacío
5. Guarda los cambios
6. Haz **Redeploy**

**Ventajas:**
- ✅ Railway usará `railway.json` de la raíz
- ✅ Todo el proyecto estará disponible
- ✅ Los scripts funcionarán correctamente

---

### Opción 2: Mover railway.json a regismac-backend/

Si prefieres mantener el Root Directory en `regismac-backend/`:

1. **Ya he creado** `regismac-backend/railway.json` con los comandos correctos
2. Los comandos incluyen `cd ..` para volver a la raíz antes de ejecutar scripts
3. Haz commit y push:
   ```bash
   git add regismac-backend/railway.json
   git commit -m "fix: agregar railway.json en regismac-backend para Railway"
   git push
   ```

**Ventajas:**
- ✅ Funciona con Root Directory en `regismac-backend/`
- ✅ No necesitas cambiar configuración en Railway

**Desventajas:**
- ⚠️ Los comandos son más complejos (necesitan `cd ..`)

---

### Opción 3: Configurar Manualmente en Railway Dashboard

Si ninguna de las anteriores funciona:

1. Ve a Railway Dashboard → Tu servicio → Settings
2. En **"Root Directory"**, cambia a `.` (raíz del proyecto)
3. En **"Build Command"**, configura manualmente:
   ```
   rm -f package-lock.json && npm install && npm run build:render
   ```
4. En **"Start Command"**:
   ```
   npm start
   ```
5. Guarda y haz Redeploy

---

## 🎯 Recomendación

**Usa la Opción 1** (cambiar Root Directory a `.`):
- Es la más limpia
- Railway detectará automáticamente `railway.json` de la raíz
- No necesitas comandos complejos con `cd ..`

---

## ✅ Verificación

Después de aplicar la solución:

1. Ve a Railway Dashboard → Tu servicio → Settings
2. Verifica que **"Railway Config File"** muestre: `/railway.json` (no `package-lock.json`)
3. Verifica que **"Root Directory"** sea `.` o esté vacío
4. Haz Redeploy y verifica los logs

---

## 🆘 Si Aún Falla

1. **Elimina el servicio** en Railway
2. **Crea uno nuevo** desde GitHub
3. **Asegúrate** de que el Root Directory sea `.` desde el inicio
4. Railway detectará automáticamente `railway.json` de la raíz

---

**La solución más rápida es cambiar el Root Directory en Railway Settings a `.` (punto).**
