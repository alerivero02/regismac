# 📥 Importar Base de Datos de Producción a Local

## Opción 1: Desde un Backup SQL Existente

Si ya tienes un archivo `.sql` de backup:

```powershell
cd regismac-backend
node scripts/importar-db-produccion.js backups/regismac_backup_YYYY-MM-DD.sql
```

O con ruta completa:
```powershell
node scripts/importar-db-produccion.js C:\ruta\completa\backup.sql
```

## Opción 2: Crear Backup desde Producción y Importarlo

### Paso 1: Crear Backup desde Producción

Si tienes acceso a la base de datos de producción, crea un backup:

**Desde MySQL/MariaDB:**
```bash
mysqldump -u usuario -p nombre_base_datos > backup_produccion.sql
```

**O desde phpMyAdmin (XAMPP):**
1. Abre phpMyAdmin
2. Selecciona la base de datos `regismac`
3. Ve a la pestaña "Exportar"
4. Selecciona "Método: Rápido" y formato "SQL"
5. Haz clic en "Continuar"
6. Guarda el archivo como `backup_produccion.sql`

### Paso 2: Importar el Backup a Local

```powershell
cd regismac-backend
node scripts/importar-db-produccion.js backup_produccion.sql
```

## Opción 3: Usar MySQL directamente

Si prefieres usar MySQL directamente:

```powershell
# Con XAMPP (sin contraseña)
C:\xampp\mysql\bin\mysql.exe -u root regismac < backup_produccion.sql

# Con XAMPP (con contraseña)
C:\xampp\mysql\bin\mysql.exe -u root -pTU_PASSWORD regismac < backup_produccion.sql

# Con MySQL Server
mysql -u root -p regismac < backup_produccion.sql
```

## Verificar la Importación

Después de importar, verifica que los datos estén correctos:

```sql
-- Conectar a MySQL
mysql -u root -p regismac

-- Verificar tablas
SHOW TABLES;

-- Verificar algunos registros
SELECT COUNT(*) FROM maquinas;
SELECT COUNT(*) FROM tests;
SELECT COUNT(*) FROM usuarios;
```

## Notas Importantes

⚠️ **ADVERTENCIA:** Importar datos de producción sobrescribirá tu base de datos local. Asegúrate de hacer un backup de tu base de datos local primero si tiene datos importantes.

### Hacer Backup de Local Antes de Importar

```powershell
cd regismac-backend
node scripts/backup-database.js
```

Esto creará un backup en `regismac-backend/backups/` con timestamp.

