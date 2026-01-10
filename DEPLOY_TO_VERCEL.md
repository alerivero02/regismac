# Guía de Despliegue a Vercel - Corrección Error "Ruta no encontrada"

## Problema Resuelto

Se corrigió el error "Ruta no encontrada" que ocurría en producción. El problema era que el handler de API en Vercel (`api/index.js`) no estaba usando la aplicación Express completa del backend.

## Cambios Realizados

1. **`api/index.js`**: Actualizado para usar la aplicación Express completa del backend
2. **`api/package.json`**: Actualizado con todas las dependencias necesarias y configurado como módulo ES
3. **`vercel.json`**: Optimizado para manejar correctamente las rutas de API y el frontend
4. **`regismac-backend/src/app.js`**: Agregado manejador de rutas no encontradas (404)
5. **`regismac-frontend/src/services/api.js`**: Mejorado el manejo de errores 404

## Pasos para Desplegar

### 1. Commit y Push de los Cambios

```powershell
# Desde la raíz del proyecto
git add .
git commit -m "Fix: Corregir error 'Ruta no encontrada' en producción - Conectar API handler con backend completo"
git push origin main
```

### 2. Verificar Variables de Entorno en Vercel

Asegúrate de tener estas variables configuradas en tu proyecto de Vercel:

**Variables Requeridas:**
```
DATABASE_URL=tu_conexion_mysql
SESSION_SECRET=tu_secret_seguro
BACKEND_URL=https://tu-dominio.vercel.app
FRONTEND_URL=https://tu-dominio.vercel.app
NODE_ENV=production
```

**Variables Opcionales (Google OAuth):**
```
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_CALLBACK_URL=https://tu-dominio.vercel.app/api/auth/google/callback
```

**Variables Opcionales (Email):**
```
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
```

### 3. Configurar Variables de Entorno

#### Opción A: Desde el Dashboard de Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega cada variable con su valor correspondiente
4. Asegúrate de seleccionar "Production", "Preview" y "Development" según necesites

#### Opción B: Desde CLI

```powershell
# Instalar Vercel CLI si no lo tienes
npm install -g vercel

# Login
vercel login

# Configurar variables (ejecutar desde la raíz del proyecto)
vercel env add DATABASE_URL production
# Pega tu connection string cuando te lo pida

vercel env add SESSION_SECRET production
# Genera uno seguro con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

vercel env add BACKEND_URL production
# Por ejemplo: https://regismac.vercel.app

vercel env add FRONTEND_URL production
# Por ejemplo: https://regismac.vercel.app

vercel env add NODE_ENV production
# Valor: production
```

### 4. Desplegar a Vercel

#### Opción A: Automatic Deployment (Recomendado)

Si tienes tu proyecto conectado a GitHub, Vercel desplegará automáticamente cuando hagas push a la rama `main`.

1. Haz push de los cambios (paso 1)
2. Ve a tu dashboard de Vercel
3. Verifica que el deployment esté en progreso
4. Espera a que termine (puede tardar 2-5 minutos)

#### Opción B: Manual Deployment

```powershell
# Desde la raíz del proyecto
vercel --prod
```

### 5. Verificar el Deployment

Una vez completado el deployment:

1. **Verifica la API**:
   - Abre: `https://tu-dominio.vercel.app/api/auth/me`
   - Deberías ver: `{"error":"No autenticado"}` (esto es correcto si no estás logueado)

2. **Verifica el Frontend**:
   - Abre: `https://tu-dominio.vercel.app`
   - Deberías ver la página de login

3. **Prueba el Login**:
   - Intenta hacer login con tus credenciales
   - Si funciona, el problema está resuelto

### 6. Troubleshooting

#### Si ves "Ruta no encontrada" todavía:

1. **Verifica los logs de Vercel**:
   ```powershell
   vercel logs tu-dominio.vercel.app --prod
   ```

2. **Verifica que las variables de entorno estén configuradas**:
   - Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
   - Asegúrate de que `DATABASE_URL` esté correctamente configurada

3. **Redeploy forzado**:
   ```powershell
   vercel --prod --force
   ```

#### Si ves errores de conexión a base de datos:

1. **Verifica que tu base de datos MySQL esté accesible desde internet**
   - Si usas un servidor local, necesitas usar un servicio como PlanetScale, Railway, o similar
   - Vercel no puede conectarse a bases de datos locales

2. **Opciones de base de datos para producción**:
   - **PlanetScale** (Recomendado, plan gratis disponible)
   - **Railway** (Plan gratis disponible)
   - **AWS RDS** (Pago)
   - **DigitalOcean Managed Database** (Pago)

#### Si ves errores de Prisma:

```powershell
# Regenerar cliente de Prisma y redesplegar
cd regismac-backend
npx prisma generate
cd ..
git add .
git commit -m "Regenerar cliente Prisma"
git push origin main
```

## Estructura de Archivos para Vercel

```
Regismac_local/
├── api/                        # Handler serverless para Vercel
│   ├── index.js               # ✅ Ahora usa la app Express completa
│   └── package.json           # ✅ Actualizado con dependencias
├── regismac-backend/          # Código del backend
│   ├── src/
│   │   ├── app.js            # ✅ App Express con todas las rutas
│   │   ├── routes/           # Todas las rutas de API
│   │   ├── controllers/      # Lógica de negocio
│   │   └── services/         # Servicios
│   └── prisma/
│       └── schema.prisma     # Esquema de base de datos
├── regismac-frontend/         # Código del frontend
│   └── dist/                 # Build del frontend (generado)
├── vercel.json               # ✅ Configuración actualizada
└── package.json              # Scripts de build
```

## Notas Importantes

1. **Base de Datos**: Asegúrate de usar una base de datos MySQL accesible desde internet para producción
2. **Migraciones**: Ejecuta las migraciones antes del primer deployment:
   ```powershell
   # Desde regismac-backend
   npx prisma migrate deploy
   ```
3. **SESSION_SECRET**: Genera uno seguro con:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
4. **Logs**: Monitorea los logs de Vercel para detectar problemas:
   ```powershell
   vercel logs --prod
   ```

## Contacto y Soporte

Si tienes problemas con el deployment, verifica:
- Los logs de Vercel
- Que todas las variables de entorno estén configuradas
- Que la base de datos sea accesible desde internet
- Que el `DATABASE_URL` tenga el formato correcto:
  ```
  mysql://usuario:password@host:3306/regismac
  ```
