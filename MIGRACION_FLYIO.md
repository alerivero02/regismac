# 🪰 Guía de Migración a Fly.io (Alternativa Gratuita)

## ¿Por qué Fly.io?

- ✅ **GRATIS** - Plan generoso sin sleep
- ✅ **SIN SLEEP** - Siempre activo
- ✅ **Muy rápido** - Edge computing
- ✅ **PostgreSQL incluido** - Base de datos gratis

## 📋 Paso 1: Instalar Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# O descarga desde: https://fly.io/docs/hands-on/install-flyctl/
```

## 📋 Paso 2: Login y crear app

```bash
fly auth login
fly launch
```

Fly detectará tu proyecto automáticamente.

## 📋 Paso 3: Configurar variables

```bash
fly secrets set NODE_ENV=production
fly secrets set DATABASE_URL=tu_connection_string
fly secrets set SESSION_SECRET=tu_secret
fly secrets set FRONTEND_URL=https://tu-app.fly.dev
fly secrets set BACKEND_URL=https://tu-app.fly.dev
fly secrets set GOOGLE_CLIENT_ID=tu_client_id
fly secrets set GOOGLE_CLIENT_SECRET=tu_client_secret
```

## 📋 Paso 4: Base de datos PostgreSQL

```bash
fly postgres create --name regismac-db
fly postgres attach regismac-db
```

Esto creará automáticamente `DATABASE_URL`.

## 📋 Paso 5: Deploy

```bash
fly deploy
```

## 💰 Costos

- **Gratis:** Plan generoso
- **Postgres:** Gratis hasta cierto límite
- **Total:** **GRATIS** para tu caso de uso

---

**Documentación:** https://fly.io/docs
