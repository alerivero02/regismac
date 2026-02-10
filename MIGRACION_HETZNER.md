# 🖥️ Guía de Migración a Hetzner Cloud (€3.79/mes)

## ¿Por qué Hetzner?

- ✅ **€3.79/mes** - Dentro de tu presupuesto
- ✅ **Siempre activo** - VPS 24/7
- ✅ **Sin límites** - Control total
- ✅ **PostgreSQL incluido** - Puedes instalar tu propia BD

## 📋 Paso 1: Crear cuenta y servidor

1. Ve a https://www.hetzner.com/cloud
2. Crea cuenta (verificación requerida)
3. Click **"New Project"** → **"Add Server"**
4. Elige:
   - **Ubuntu 22.04** o **24.04**
   - **CX22** (€3.79/mes): 2 CPU, 4GB RAM, 40GB disco
   - **Ubicación:** Frankfurt (cerca de tus usuarios)
5. Click **"Create & Buy Now"**

## 📋 Paso 2: Conectar al servidor

```bash
# Windows (PowerShell)
ssh root@TU_IP_SERVIDOR

# O usa PuTTY con la IP que Hetzner te dio
```

## 📋 Paso 3: Instalar Node.js y dependencias

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Instalar Git
apt install -y git

# Instalar PM2 (gestor de procesos)
npm install -g pm2
```

## 📋 Paso 4: Configurar PostgreSQL

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE regismac;
CREATE USER regismac_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE regismac TO regismac_user;
\q
```

## 📋 Paso 5: Clonar y configurar tu app

```bash
# Crear directorio
mkdir -p /var/www
cd /var/www

# Clonar repositorio (o usar git pull)
git clone https://github.com/TU_USUARIO/regismac.git
cd regismac

# Instalar dependencias
cd regismac-backend
npm install
npx prisma generate
npx prisma migrate deploy

cd ../regismac-frontend
npm install
npm run build
```

## 📋 Paso 6: Configurar variables de entorno

```bash
cd /var/www/regismac/regismac-backend
nano .env
```

Agrega:

```env
NODE_ENV=production
DATABASE_URL=postgresql://regismac_user:tu_password@localhost:5432/regismac
SESSION_SECRET=tu_secret_generado
FRONTEND_URL=https://tu-dominio.com
BACKEND_URL=https://tu-dominio.com
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
PORT=3000
```

## 📋 Paso 7: Configurar Nginx (reverse proxy)

```bash
# Instalar Nginx
apt install -y nginx

# Crear configuración
nano /etc/nginx/sites-available/regismac
```

Contenido:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activar configuración
ln -s /etc/nginx/sites-available/regismac /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 📋 Paso 8: Iniciar con PM2

```bash
cd /var/www/regismac/regismac-backend
pm2 start index.js --name regismac
pm2 save
pm2 startup  # Configurar para iniciar al arrancar servidor
```

## 📋 Paso 9: SSL con Let's Encrypt (Gratis)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d tu-dominio.com
```

## 💰 Costos

- **Servidor:** €3.79/mes (CX22)
- **Dominio:** €1-2/mes (opcional, puedes usar IP)
- **Total:** **€3.79-5.79/mes**

## 🔄 Actualizar código

```bash
cd /var/www/regismac
git pull
cd regismac-backend
npm install
npx prisma generate
npx prisma migrate deploy
cd ../regismac-frontend
npm install
npm run build
pm2 restart regismac
```

## 🆘 Troubleshooting

### Ver logs
```bash
pm2 logs regismac
```

### Reiniciar servicio
```bash
pm2 restart regismac
```

### Ver estado
```bash
pm2 status
```

---

**Documentación:** https://docs.hetzner.com/
