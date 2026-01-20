# Sistema de Backups en Producción

## ⚠️ IMPORTANTE: No podemos perder datos

Este documento describe cómo se están manejando los backups en producción y cómo configurar backups automáticos para proteger los datos.

## 📋 Estado Actual

### Scripts Disponibles

1. **`regismac-backend/scripts/backup-database.js`**
   - Script de backup para MySQL (desarrollo local)
   - Crea backups en `regismac-backend/backups/`
   - Mantiene los últimos 30 backups
   - Limpia automáticamente backups antiguos

2. **`regismac-backend/scripts/backup-automatico.ps1`**
   - Script PowerShell para ejecutar backups automáticos
   - Solo funciona en Windows

### ⚠️ Problema Actual

**NO hay backups automáticos configurados en producción.**

Los backups actuales son:
- Manuales (ejecutados manualmente cuando se recuerda)
- Solo funcionan con MySQL (no PostgreSQL que se usa en Render)
- No están programados automáticamente

## 🔧 Soluciones Implementadas

### ✅ Opción 1: Backups Automáticos Integrados (IMPLEMENTADO)

El sistema ahora incluye backups automáticos que se ejecutan periódicamente cuando el servidor está activo:

- **Frecuencia**: Cada 24 horas (configurable con `BACKUP_INTERVAL_HOURS`)
- **Ubicación**: `regismac-backend/backups/`
- **Retención**: Mantiene los últimos 30 backups
- **Activación**: Automático en producción (deshabilitable con `ENABLE_AUTO_BACKUPS=false`)

**Configuración en Render:**
```env
ENABLE_AUTO_BACKUPS=true          # Habilitar backups automáticos (por defecto: true)
BACKUP_INTERVAL_HOURS=24          # Intervalo en horas (por defecto: 24)
BACKUP_ON_START=true              # Ejecutar backup al iniciar (por defecto: true)
```

### ✅ Opción 2: Endpoint de API para Backups Manuales (IMPLEMENTADO)

Endpoint protegido para ejecutar backups manualmente:

- **POST** `/api/backup/execute` - Ejecutar backup manual (requiere admin)
- **GET** `/api/backup/status` - Ver estado de backups (requiere admin)

**Uso:**
```bash
# Ejecutar backup manual
curl -X POST https://tu-dominio.com/api/backup/execute \
  -H "Cookie: regismac.sid=tu-sesion-cookie"

# Ver estado
curl https://tu-dominio.com/api/backup/status \
  -H "Cookie: regismac.sid=tu-sesion-cookie"
```

### Opción 3: Backups Automáticos con Servicio Externo de Cron Jobs

Para mayor confiabilidad, puedes usar un servicio externo que llame al endpoint:

**Servicios recomendados:**
- [cron-job.org](https://cron-job.org) (gratis)
- [EasyCron](https://www.easycron.com) (gratis con limitaciones)
- [UptimeRobot](https://uptimerobot.com) (gratis)

**Configuración:**
1. Crear cuenta en el servicio
2. Configurar cron job que llame a: `POST https://tu-dominio.com/api/backup/execute`
3. Agregar autenticación (cookie de sesión o token)
4. Programar ejecución diaria

### Opción 4: Backups con Render (Planes Pagos)

Render ofrece backups automáticos para bases de datos PostgreSQL en planes pagos. Si estás usando el plan gratuito, considera upgrade.

## 📝 Instrucciones para Backups Manuales

### En Desarrollo Local (MySQL)

```powershell
cd regismac-backend
node scripts/backup-database.js
```

Los backups se guardan en: `regismac-backend/backups/`

### En Producción (PostgreSQL)

#### Opción 1: Usando el script de backup (Recomendado)

```bash
cd regismac-backend
npm run backup:postgres
```

Este script:
- Usa `pg_dump` para crear el backup
- Guarda en `regismac-backend/backups/`
- Limpia automáticamente backups antiguos (mantiene últimos 30)

#### Opción 2: Manual con pg_dump

```bash
# Conectar a la base de datos
psql $DATABASE_URL

# Crear backup manual
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Opción 3: Panel de Render

1. Ir a Dashboard de Render
2. Seleccionar tu base de datos PostgreSQL
3. Ir a "Backups" o "Manual Backup"
4. Crear backup manual

**Nota**: El panel de Render solo está disponible en planes pagos. Si estás en plan gratuito, usa las opciones 1 o 2.

## ✅ Estado Actual

**Backups automáticos están IMPLEMENTADOS y ACTIVOS**

El sistema ahora incluye:
- ✅ Backups automáticos cada 24 horas
- ✅ Endpoint de API para backups manuales
- ✅ Limpieza automática de backups antiguos
- ✅ Script de backup para PostgreSQL

### Verificación:

1. ✅ **Verificar que los backups se están creando**
   - Revisar logs del servidor en Render
   - Buscar mensajes: "🔄 Ejecutando backup automático..."
   - Verificar carpeta `backups/` en el servidor

2. ✅ **Probar backup manual**
   - Usar endpoint `/api/backup/execute` como admin
   - Verificar que se crea el archivo correctamente

3. ✅ **Configurar almacenamiento remoto** (RECOMENDADO)
   - Los backups se guardan localmente en el servidor
   - Considerar copiar backups a almacenamiento remoto (S3, Google Drive, etc.)

## 📦 Almacenamiento de Backups

### Recomendaciones:

1. **Múltiples ubicaciones**
   - Local (servidor)
   - Remoto (Google Drive, Dropbox, S3)
   - Backup físico (USB, disco externo)

2. **Retención**
   - Diarios: últimos 7 días
   - Semanales: últimas 4 semanas
   - Mensuales: últimos 12 meses

3. **Verificación**
   - Verificar que los backups sean válidos
   - Probar restauración periódicamente
   - Monitorear tamaño de backups

## 🔍 Verificación de Backups

### Verificar que un backup es válido:

```bash
# Para MySQL
mysql -u usuario -p base_de_datos < backup.sql

# Para PostgreSQL
psql $DATABASE_URL < backup.sql
```

### Listar backups disponibles:

```bash
# Ver backups locales
ls -lh regismac-backend/backups/

# Ver backups en Render (si están disponibles)
# Ir al panel de Render > Base de datos > Backups
```

## 📞 Contacto y Soporte

Si necesitas ayuda para configurar backups automáticos:
1. Revisar documentación de Render sobre backups
2. Considerar servicios externos (AWS S3, Google Cloud Storage)
3. Implementar solución personalizada con cron jobs

## ✅ Checklist de Implementación

- [ ] Verificar último backup realizado
- [ ] Decidir método de backups automáticos
- [ ] Implementar solución elegida
- [ ] Probar creación de backup
- [ ] Probar restauración de backup
- [ ] Configurar alertas de fallos
- [ ] Documentar proceso de restauración
- [ ] Configurar almacenamiento remoto
- [ ] Establecer política de retención
- [ ] Programar verificaciones periódicas
