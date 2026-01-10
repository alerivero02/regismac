# 🚀 Guía de Despliegue Profesional en Vercel - RegisMac

## 📋 Requisitos Previos

1. ✅ Cuenta en [Vercel](https://vercel.com) (gratuita o Pro)
2. ✅ Repositorio en GitHub: `https://github.com/alerivero02/Regismac_1.0.git`
3. ✅ Base de datos PostgreSQL configurada (recomendado: [Neon](https://neon.tech), [Supabase](https://supabase.com), o [Railway](https://railway.app))
4. ✅ Node.js 18+ y npm 9+ instalados localmente

## 🏗️ Arquitectura del Despliegue

```
Regismac_1.0/
├── api/
│   └── index.js          # Serverless Function Handler para Vercel
├── regismac-frontend/    # Aplicación React (SPA)
├── regismac-backend/     # API Express (Serverless Functions)
├── vercel.json           # Configuración de Vercel
└── package.json          # Scripts de build
```

## 🚀 Pasos para Desplegar

### 1. Preparación del Repositorio

Asegúrate de que todos los cambios estén pusheados:

```bash
git add .
git commit -m "feat: Configuración para Vercel"
git push origin desarrollo
```

### 2. Conectar Repositorio con Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión con GitHub
2. Click en **"Add New Project"** o **"Import Project"**
3. Selecciona el repositorio `Regismac_1.0`
4. Selecciona la rama `desarrollo` (o `main` para producción)

### 3. Configuración del Proyecto en Vercel

#### ⚙️ Configuración General

- **Project Name**: `regismac` (o el nombre que prefieras)
- **Root Directory**: `Regismac_1.0` ⚠️ **IMPORTANTE**
- **Framework Preset**: **Other** (no selecciones ningún framework)
- **Build Command**: *(dejar vacío - se usa el de vercel.json)*
- **Output Directory**: *(dejar vacío - se usa el de vercel.json)*
- **Install Command**: *(dejar vacío - se usa npm ci automáticamente)*

### 4. Variables de Entorno

**⚠️ CRÍTICO**: Configura todas las variables de entorno antes del primer despliegue.

En Vercel, ve a **Settings → Environment Variables** y agrega:

#### 🔐 Variables Requeridas (Obligatorias)

```env
# Entorno
NODE_ENV=production

# Base de Datos PostgreSQL
DATABASE_URL=postgresql://usuario:password@host:puerto/database?schema=public

# Seguridad
JWT_SECRET=tu_jwt_secret_muy_seguro_y_largo_minimo_32_caracteres
SESSION_SECRET=tu_session_secret_muy_seguro_y_largo_minimo_32_caracteres

# Frontend URL (actualizar después del primer deploy)
FRONTEND_URL=https://tu-proyecto.vercel.app
```

#### 🔑 Variables Opcionales (según funcionalidades)

```env
# Google OAuth (si usas autenticación con Google)
GOOGLE_CLIENT_ID=tu_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://tu-proyecto.vercel.app/api/auth/google/callback

# Email (si usas notificaciones por email)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_password_de_aplicacion_gmail

# Google Drive (si usas almacenamiento en Drive)
GOOGLE_DRIVE_FOLDER_ID=tu_folder_id_de_google_drive

# Rate Limiting (opcional)
ENABLE_RATE_LIMIT=true
```

**💡 Tip**: Genera secrets seguros con:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 📍 Configuración por Ambiente

Puedes configurar variables diferentes para:
- **Production**: Producción (rama `main`)
- **Preview**: Previews (otras ramas)
- **Development**: Desarrollo local

**Recomendación**: Configura `FRONTEND_URL` después del primer deploy con la URL real de Vercel.

### 5. Configuración de Base de Datos

**⚠️ IMPORTANTE**: Vercel no ejecuta migraciones de Prisma automáticamente.

#### Opción A: Ejecutar Migraciones Localmente

```bash
cd Regismac_1.0/regismac-backend
npx prisma migrate deploy
```

#### Opción B: Usar un Servicio con Migraciones Automáticas

Recomendamos estos servicios que soportan PostgreSQL:

1. **[Neon](https://neon.tech)** - PostgreSQL serverless (recomendado)
2. **[Supabase](https://supabase.com)** - PostgreSQL con migraciones
3. **[Railway](https://railway.app)** - PostgreSQL con auto-deploy
4. **[PlanetScale](https://planetscale.com)** - MySQL compatible

#### Configuración de Prisma en Vercel

El archivo `package.json` incluye un script `postinstall` que genera el cliente de Prisma automáticamente durante el build.

### 6. Primer Despliegue

1. Click en **"Deploy"** en Vercel
2. Monitorea los logs del build:
   - ✅ Instalación de dependencias
   - ✅ Generación de Prisma Client
   - ✅ Build del frontend
   - ✅ Preparación de funciones serverless
3. Una vez completado, copia la URL del proyecto (ej: `https://regismac.vercel.app`)
4. **Actualiza** la variable `FRONTEND_URL` en Vercel con esta URL
5. **Redeploy** para aplicar los cambios

### 7. Verificación Post-Despliegue

1. ✅ Verifica que el frontend carga correctamente
2. ✅ Prueba una llamada API: `https://tu-proyecto.vercel.app/api/maquinas`
3. ✅ Verifica la conexión a la base de datos en los logs
4. ✅ Prueba el login y autenticación

## ⚙️ Configuración Técnica Detallada

### Estructura de Archivos para Vercel

```
Regismac_1.0/
├── api/
│   └── index.js              # Handler serverless (ya creado)
├── regismac-frontend/
│   ├── dist/                 # Output del build (generado)
│   └── ...
├── regismac-backend/
│   └── ...
├── vercel.json               # Configuración principal
├── package.json              # Scripts de build
└── .vercelignore            # Archivos a ignorar
```

### Funcionamiento del Backend Serverless

El archivo `api/index.js` actúa como wrapper que:
1. ✅ Inicializa Prisma Client de forma eficiente
2. ✅ Maneja conexiones de base de datos
3. ✅ Convierte Express en función serverless compatible
4. ✅ Maneja errores y desconexiones limpias

### Timeouts y Límites

- **Hobby Plan**: 10 segundos por función
- **Pro Plan**: 60 segundos por función (configurado en `vercel.json`)
- **Enterprise**: Hasta 300 segundos

Para operaciones largas, considera:
- Usar jobs en background
- Dividir operaciones en múltiples requests
- Usar WebSockets para operaciones en tiempo real

## ⚠️ Consideraciones Importantes

### Limitaciones de Vercel Serverless

1. **Cold Starts**: Primera request puede ser más lenta (~1-2 segundos)
2. **Timeouts**: Operaciones largas pueden fallar (configurar timeout en `vercel.json`)
3. **Base de Datos Externa**: Requiere servicio externo de PostgreSQL
4. **Sesiones**: Las sesiones en memoria no persisten entre invocaciones (usar Redis o DB)

### Optimizaciones Implementadas

✅ **Prisma Connection Pooling**: Reutiliza conexiones eficientemente  
✅ **Headers de Seguridad**: Configurados en `vercel.json`  
✅ **CORS**: Configurado para producción  
✅ **Rate Limiting**: Implementado en el backend  
✅ **Build Optimizado**: Usa `npm ci` para builds más rápidos y confiables  

### Alternativas Recomendadas (si es necesario)

Si encuentras limitaciones, considera arquitectura híbrida:

#### Opción 1: Backend Separado (Recomendado para producción)
- **Backend**: [Railway](https://railway.app) o [Render](https://render.com)
- **Frontend**: Vercel
- **Ventajas**: Más control, mejor para operaciones largas

#### Opción 2: Solo Frontend en Vercel
- **Frontend**: Vercel
- **Backend**: Servidor dedicado o VPS
- **Ventajas**: Máximo control del backend

## 🔧 Troubleshooting

### ❌ Error: "Cannot find module"

**Causa**: Dependencias faltantes o rutas incorrectas

**Solución**:
```bash
# Verifica que package.json tenga todas las dependencias
cd Regismac_1.0
npm install

# Verifica que Root Directory esté configurado como "Regismac_1.0" en Vercel
```

### ❌ Error: "Database connection failed"

**Causa**: URL incorrecta o firewall de la base de datos

**Solución**:
1. Verifica `DATABASE_URL` en Vercel (formato: `postgresql://user:pass@host:port/db`)
2. Asegúrate de que tu proveedor de DB permita conexiones desde cualquier IP (0.0.0.0/0)
3. Para Neon/Supabase: Verifica que el pooler esté habilitado
4. Revisa los logs de Vercel para el error específico

### ❌ Error: "Build failed" o "Build timeout"

**Causa**: Build muy lento o dependencias pesadas

**Solución**:
1. Revisa los logs completos en Vercel
2. Verifica que `vercel.json` tenga la configuración correcta
3. Asegúrate de que `.vercelignore` excluya archivos innecesarios
4. Considera usar `npm ci` en lugar de `npm install` (ya configurado)

### ❌ Error: "Prisma Client not generated"

**Causa**: Script postinstall no se ejecutó

**Solución**:
```bash
# Localmente, ejecuta:
cd Regismac_1.0/regismac-backend
npx prisma generate

# En Vercel, verifica que package.json tenga el script postinstall
```

### ❌ Error: "Function timeout"

**Causa**: Operación muy larga (>60 segundos en Pro)

**Solución**:
1. Optimiza queries de base de datos
2. Implementa paginación
3. Divide operaciones grandes en múltiples requests
4. Considera usar jobs en background

### ❌ Error: CORS o "Origin not allowed"

**Causa**: `FRONTEND_URL` no configurada o incorrecta

**Solución**:
1. Verifica `FRONTEND_URL` en Vercel (debe ser la URL completa: `https://tu-proyecto.vercel.app`)
2. Asegúrate de que incluya `https://` y no termine en `/`
3. Redeploy después de cambiar variables de entorno

## 📊 Monitoreo y Logs

### Ver Logs en Vercel

1. Ve a tu proyecto en Vercel
2. Click en **"Deployments"**
3. Selecciona un deployment
4. Click en **"Functions"** para ver logs de API
5. Click en **"Build Logs"** para ver logs del build

### Métricas Importantes

- ⏱️ **Function Duration**: Tiempo de ejecución de funciones
- 📈 **Invocation Count**: Número de llamadas
- ❌ **Error Rate**: Porcentaje de errores
- 💾 **Memory Usage**: Uso de memoria

## 🔄 Actualizaciones y CI/CD

### Despliegue Automático

Vercel despliega automáticamente cuando:
- ✅ Haces push a la rama conectada
- ✅ Creas un Pull Request
- ✅ Haces merge a la rama principal

### Workflow Recomendado

1. **Desarrollo**: Trabaja en rama `desarrollo`
2. **Preview**: Cada PR genera un preview en Vercel
3. **Producción**: Merge a `main` despliega a producción

### Variables de Entorno por Rama

Configura variables diferentes para:
- **Production** (`main`): Variables de producción
- **Preview** (otras ramas): Variables de desarrollo/testing

## 📝 Checklist Pre-Despliegue

Antes de desplegar a producción, verifica:

- [ ] ✅ Todas las variables de entorno configuradas
- [ ] ✅ Base de datos creada y migraciones ejecutadas
- [ ] ✅ `FRONTEND_URL` actualizada con la URL de Vercel
- [ ] ✅ Secrets generados de forma segura (32+ caracteres)
- [ ] ✅ CORS configurado correctamente
- [ ] ✅ Prisma Client generado (`postinstall` script)
- [ ] ✅ Build del frontend funciona localmente
- [ ] ✅ Tests pasan (si los tienes)
- [ ] ✅ `.vercelignore` configurado correctamente
- [ ] ✅ Documentación actualizada

## 🎯 Próximos Pasos

1. **Monitoreo**: Configura alertas en Vercel
2. **Analytics**: Integra Vercel Analytics para métricas
3. **Performance**: Optimiza imágenes y assets
4. **SEO**: Configura meta tags y sitemap
5. **Backup**: Configura backups automáticos de la base de datos

## 📚 Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Prisma con Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Mejores Prácticas de Vercel](https://vercel.com/docs/concepts/deployments/best-practices)

---

**¿Necesitas ayuda?** Revisa los logs en Vercel o consulta la documentación oficial.

