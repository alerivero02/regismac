# 🗄️ Guía Segura de Migración de Base de Datos

## ⚠️ IMPORTANTE: Los datos NO se pierden

**La migración de código NO afecta tu base de datos.** Son servicios separados:
- ✅ **Código/Backend** → Se migra a Railway
- ✅ **Base de datos** → Se mantiene en Render O se migra a Railway PostgreSQL

## 📋 Opciones de Migración (Elige una)

### Opción 1: Mantener Base de Datos en Render (Más Seguro) ⭐ RECOMENDADO

**Ventajas:**
- ✅ **CERO riesgo** de perder datos
- ✅ No necesitas hacer backup/restore
- ✅ Puedes migrar el código primero y probar
- ✅ Luego decides si migrar la BD o dejarla en Render

**Pasos:**

1. **Obtén la URL de conexión de Render:**
   - Ve a tu proyecto en Render
   - Click en tu servicio de PostgreSQL
   - Ve a **"Connections"** o **"Info"**
   - Copia la **"Internal Database URL"** o **"External Database URL"**

2. **En Railway, usa la misma base de datos:**
   - En Railway, ve a **Settings → Variables**
   - Agrega `DATABASE_URL` con la URL de Render
   - Ejemplo: `postgresql://user:password@dpg-xxxxx-a.frankfurt-postgres.render.com/dbname`

3. **¡Listo!** Tu código en Railway usará la misma base de datos de Render

**Nota:** Render permite conexiones externas a PostgreSQL, así que Railway puede conectarse sin problemas.

---

### Opción 2: Migrar Base de Datos a Railway PostgreSQL (Completo)

**Ventajas:**
- ✅ Todo en un solo lugar (Railway)
- ✅ Más fácil de gestionar
- ✅ Posiblemente más rápido

**Pasos:**

#### Paso 1: Hacer Backup de Render

```bash
# Opción A: Desde tu máquina local
# Conecta a la base de datos de Render
pg_dump "postgresql://user:password@dpg-xxxxx-a.frankfurt-postgres.render.com/dbname" > backup.sql

# Opción B: Usar herramienta gráfica (pgAdmin, DBeaver, etc.)
# Conecta a Render PostgreSQL y exporta toda la base de datos
```

#### Paso 2: Crear PostgreSQL en Railway

1. En Railway, click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway creará automáticamente la variable `DATABASE_URL`
3. Espera a que esté lista (Status: Active)

#### Paso 3: Restaurar Datos en Railway

```bash
# Opción A: Desde tu máquina local con Railway CLI
railway link  # Conecta a tu proyecto
railway run psql $DATABASE_URL < backup.sql

# Opción B: Desde tu máquina local directamente
psql "postgresql://user:password@railway-postgres-url/dbname" < backup.sql

# Opción C: Usar herramienta gráfica
# Conecta a Railway PostgreSQL e importa el backup.sql
```

#### Paso 4: Ejecutar Migraciones

```bash
cd regismac-backend
railway run npx prisma migrate deploy
```

#### Paso 5: Verificar Datos

- Conecta a Railway PostgreSQL y verifica que todos los datos estén ahí
- Prueba tu aplicación para asegurarte de que todo funciona

---

### Opción 3: Migración Gradual (Más Seguro)

**Estrategia:**
1. **Fase 1:** Migra código a Railway pero mantén BD en Render
2. **Fase 2:** Prueba que todo funcione correctamente
3. **Fase 3:** Si todo está bien, migra la BD a Railway
4. **Fase 4:** Elimina Render cuando estés seguro

**Ventajas:**
- ✅ Puedes volver atrás si algo falla
- ✅ Pruebas sin riesgo
- ✅ Migración controlada paso a paso

---

## 🔒 Checklist de Seguridad

Antes de hacer CUALQUIER cambio:

- [ ] **Backup completo** de la base de datos de Render
- [ ] **Verificar** que el backup se puede restaurar (prueba en local)
- [ ] **Documentar** todas las URLs de conexión
- [ ] **Probar** la conexión desde Railway a Render PostgreSQL
- [ ] **Verificar** que los datos se leen correctamente
- [ ] **Tener plan B** (poder volver a Render si algo falla)

---

## 🛠️ Herramientas Útiles

### Para hacer backup/restore:

1. **pg_dump / psql** (línea de comandos)
   ```bash
   # Backup
   pg_dump DATABASE_URL > backup.sql
   
   # Restore
   psql DATABASE_URL < backup.sql
   ```

2. **pgAdmin** (interfaz gráfica)
   - Descarga: https://www.pgadmin.org/
   - Conecta a Render PostgreSQL
   - Click derecho → Backup
   - Luego conecta a Railway PostgreSQL
   - Click derecho → Restore

3. **DBeaver** (interfaz gráfica)
   - Descarga: https://dbeaver.io/
   - Similar a pgAdmin pero más moderno

---

## ⚡ Recomendación Final

**Para tu caso específico, recomiendo:**

1. **Primero:** Migra el código a Railway pero **mantén la BD en Render**
   - Cero riesgo
   - Puedes probar todo
   - Si algo falla, vuelves a Render fácilmente

2. **Luego:** Si Railway funciona bien y quieres consolidar todo:
   - Haz backup completo de Render
   - Crea PostgreSQL en Railway
   - Restaura el backup
   - Verifica que todo funciona
   - Elimina Render

3. **Mientras tanto:** Mantén Render activo como respaldo

---

## 🆘 Si Algo Sale Mal

**NO ENTRES EN PÁNICO:**

1. **Los datos siguen en Render** (si no los eliminaste)
2. **Puedes volver a Render** cambiando `DATABASE_URL`
3. **Tienes el backup** (si lo hiciste)
4. **Railway y Render pueden coexistir** (usa el que funcione)

---

## 📞 Soporte

Si tienes dudas o problemas durante la migración:
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs

**Recuerda: La migración de código NO borra datos. Los datos están seguros en PostgreSQL.**
