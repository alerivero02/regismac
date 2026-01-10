# 🚀 Deployment Rápido a Vercel con Neon

## ✅ Tu Base de Datos está Lista

Ya tienes Neon (PostgreSQL) configurado:
```
postgresql://neondb_owner:...@ep-lingering-tooth-agdmiw5c-pooler...neon.tech/neondb
```

## 📋 Pasos Rápidos (5 minutos)

### Opción A: Script Automático (Recomendado)

```powershell
.\scripts\deploy-neon-completo.ps1
```

Este script hace TODO automáticamente:
- ✅ Ejecuta migraciones en Neon
- ✅ Crea usuario administrador
- ✅ Te guía para configurar variables en Vercel
- ✅ Hace commit y push automático

### Opción B: Manual

#### 1. Ejecutar migraciones

```powershell
.\scripts\migrate-neon.ps1
```

#### 2. Crear admin

```powershell
.\scripts\create-admin-neon.ps1
```

#### 3. Configurar variables en Vercel

Ve a: https://vercel.com/dashboard → Tu Proyecto → Settings → Environment Variables

Agrega estas variables:

```bash
DATABASE_URL=postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

BACKEND_URL=https://tu-proyecto.vercel.app
FRONTEND_URL=https://tu-proyecto.vercel.app
NODE_ENV=production

# Genera uno con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
SESSION_SECRET=tu_secret_aqui
```

#### 4. Deploy

```powershell
git add .
git commit -m "Deploy con Neon DB"
git push origin main
```

## 🔍 Verificar Deployment

1. **API funciona:**
   - Abre: `https://tu-proyecto.vercel.app/api/auth/me`
   - Debe mostrar: `{"error":"No autenticado"}`

2. **Frontend carga:**
   - Abre: `https://tu-proyecto.vercel.app`
   - Debe mostrar la página de login

3. **Login funciona:**
   - Inicia sesión con tu admin
   - Si funciona, ¡listo! 🎉

## 🐛 Si algo falla

```powershell
# Ver logs en tiempo real
vercel logs --prod --follow

# Redeploy forzado
vercel --prod --force

# Ver variables configuradas
vercel env ls
```

## 📖 Documentación Completa

- **`DEPLOY_NEON.md`** - Guía detallada con troubleshooting
- **`api/index.js`** - Handler actualizado para usar backend completo

## ⚡ Resumen de Cambios

✅ `api/index.js` - Ahora usa la aplicación Express completa
✅ `api/package.json` - Configurado como módulo ES con todas las dependencias
✅ `vercel.json` - Optimizado para serverless
✅ `regismac-backend/src/app.js` - Manejador de rutas 404 agregado
✅ Scripts de PowerShell para automatizar todo

## 🎯 Checklist Final

- [ ] Migraciones ejecutadas en Neon
- [ ] Usuario admin creado
- [ ] Variables de entorno en Vercel configuradas
- [ ] Código pusheado a GitHub
- [ ] Deployment completado
- [ ] Login funciona

¡Listo para producción! 🚀
