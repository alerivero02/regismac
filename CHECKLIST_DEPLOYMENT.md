# ✅ Checklist de Deployment - Regismac en Vercel + Neon

## Estado Actual

- ✅ Base de datos Neon configurada (PostgreSQL)
- ✅ Schema de Prisma actualizado
- ✅ API handler corregido (`api/index.js`)
- ✅ Manejador de errores 404 agregado
- ✅ Scripts de deployment creados

## 🎯 Tareas Pendientes

### 1. Base de Datos

- [ ] **Ejecutar migraciones en Neon**
  ```powershell
  .\scripts\migrate-neon.ps1
  ```
  O manualmente:
  ```powershell
  cd regismac-backend
  $env:DATABASE_URL="postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
  npx prisma generate
  npx prisma db push
  ```

### 2. Usuario Administrador

- [ ] **Crear usuario admin**
  ```powershell
  .\scripts\create-admin-neon.ps1
  ```
  O manualmente:
  ```powershell
  cd regismac-backend
  $env:DATABASE_URL="postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
  node scripts/createAdmin.js admin@regismac.com Admin123! Administrador
  ```

### 3. Variables de Entorno en Vercel

- [ ] **Ir a Vercel Dashboard**
  - URL: https://vercel.com/dashboard
  - Selecciona tu proyecto
  - Settings → Environment Variables

- [ ] **Agregar DATABASE_URL**
  ```
  postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
  ```

- [ ] **Agregar BACKEND_URL**
  ```
  https://tu-proyecto.vercel.app
  ```

- [ ] **Agregar FRONTEND_URL**
  ```
  https://tu-proyecto.vercel.app
  ```

- [ ] **Agregar NODE_ENV**
  ```
  production
  ```

- [ ] **Generar y agregar SESSION_SECRET**
  ```powershell
  # Genera uno con:
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  # Copia el resultado y agrégalo a Vercel
  ```

### 4. Deployment

- [ ] **Commit de cambios**
  ```powershell
  git add .
  git commit -m "Fix: Configurar API handler para producción con Neon DB"
  ```

- [ ] **Push a GitHub**
  ```powershell
  git push origin main
  ```

- [ ] **Verificar deployment en Vercel**
  - Ve a: https://vercel.com/dashboard
  - Espera a que termine el deployment (2-5 minutos)

### 5. Verificación

- [ ] **Verificar API**
  - Abre: `https://tu-proyecto.vercel.app/api/auth/me`
  - Debe mostrar: `{"error":"No autenticado"}`

- [ ] **Verificar Frontend**
  - Abre: `https://tu-proyecto.vercel.app`
  - Debe cargar la página de login

- [ ] **Probar Login**
  - Inicia sesión con tu usuario admin
  - Debe funcionar correctamente

- [ ] **Verificar funcionalidades**
  - Dashboard carga
  - Puedes crear técnicos
  - Puedes registrar máquinas
  - Puedes crear tests

## 🚀 Script Todo-en-Uno

Si prefieres, ejecuta este script que hace TODOS los pasos automáticamente:

```powershell
.\scripts\deploy-neon-completo.ps1
```

## 📊 Comandos Útiles

### Ver logs en tiempo real
```powershell
vercel logs --prod --follow
```

### Ver variables de entorno
```powershell
vercel env ls
```

### Redeploy forzado
```powershell
vercel --prod --force
```

### Abrir Prisma Studio (ver datos)
```powershell
cd regismac-backend
$env:DATABASE_URL="postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
npx prisma studio
```

## 🐛 Troubleshooting

### Error: "Ruta no encontrada"
✅ Ya está corregido. Solo push los cambios.

### Error: "Database not found"
❌ No ejecutaste las migraciones
✅ Ejecuta: `.\scripts\migrate-neon.ps1`

### Error: "No autenticado" (login no funciona)
❌ SESSION_SECRET no configurado en Vercel
✅ Genera uno y agrégalo a las variables de entorno

### Error 500 en producción
❌ Variables de entorno no configuradas
✅ Verifica que todas las variables estén en Vercel

## 📖 Documentación

- `DEPLOY_RAPIDO.md` - Guía rápida (este archivo resumido)
- `DEPLOY_NEON.md` - Guía completa con detalles
- `DEPLOY_TO_VERCEL.md` - Guía general de Vercel

## ✅ Checklist Final

Marca estas casillas cuando completes cada tarea:

- [ ] Migraciones ejecutadas
- [ ] Admin creado
- [ ] Variables en Vercel configuradas
- [ ] Código pusheado
- [ ] Deployment completado
- [ ] API funciona
- [ ] Frontend carga
- [ ] Login funciona
- [ ] Todas las funcionalidades operativas

## 🎉 ¡Listo!

Cuando todas las casillas estén marcadas, tu aplicación estará completamente desplegada en producción.

---

**Última actualización:** 2026-01-10
**Base de datos:** Neon PostgreSQL
**Hosting:** Vercel
