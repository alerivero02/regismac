# Instrucciones para Corregir Usuarios Técnicos

## Problema
Los usuarios `Mahmudlhasan429@gmail.com` y `marcocarinci.ecosun@gmail.com` no aparecen en las páginas de Registri y Test porque:
1. Pueden no tener el rol `'tecnico'`
2. Pueden no tener el estado `'aprobado'`
3. Pueden no tener un registro en la tabla `Tecnico` asociado

## Solución Rápida: Script SQL

La forma más rápida es ejecutar el script SQL directamente en tu base de datos PostgreSQL:

### Opción 1: Usando psql (línea de comandos)
```bash
psql -U tu_usuario -d regismac -f scripts/fixTecnicos.sql
```

### Opción 2: Usando un cliente gráfico (pgAdmin, DBeaver, etc.)
1. Abre tu cliente de base de datos
2. Conéctate a la base de datos `regismac`
3. Abre el archivo `scripts/fixTecnicos.sql`
4. Ejecuta todas las consultas

### Opción 3: Ejecutar consultas manualmente
Ejecuta estas consultas en orden:

```sql
-- 1. Verificar estado actual
SELECT 
    id_usuario,
    email,
    nombre,
    apellido,
    rol,
    estado,
    fecha_aprobacion,
    (SELECT COUNT(*) FROM "Tecnico" WHERE id_usuario = u.id_usuario) as tiene_tecnico
FROM "Usuario" u
WHERE email IN ('Mahmudlhasan429@gmail.com', 'marcocarinci.ecosun@gmail.com');

-- 2. Actualizar rol a 'tecnico'
UPDATE "Usuario"
SET rol = 'tecnico'
WHERE email IN ('Mahmudlhasan429@gmail.com', 'marcocarinci.ecosun@gmail.com')
  AND rol != 'tecnico';

-- 3. Actualizar estado a 'aprobado'
UPDATE "Usuario"
SET estado = 'aprobado',
    fecha_aprobacion = COALESCE(fecha_aprobacion, NOW())
WHERE email IN ('Mahmudlhasan429@gmail.com', 'marcocarinci.ecosun@gmail.com')
  AND estado != 'aprobado';

-- 4. Crear registros de técnico
INSERT INTO "Tecnico" (nome, cognome, id_usuario)
SELECT 
    nombre,
    COALESCE(apellido, ''),
    id_usuario
FROM "Usuario"
WHERE email IN ('Mahmudlhasan429@gmail.com', 'marcocarinci.ecosun@gmail.com')
  AND estado = 'aprobado'
  AND rol = 'tecnico'
  AND id_usuario NOT IN (SELECT id_usuario FROM "Tecnico" WHERE id_usuario IS NOT NULL)
ON CONFLICT (id_usuario) DO NOTHING;

-- 5. Verificar resultado
SELECT 
    t.id_tecnico,
    t.nome,
    t.cognome,
    u.email,
    u.rol,
    u.estado
FROM "Tecnico" t
INNER JOIN "Usuario" u ON t.id_usuario = u.id_usuario
WHERE u.email IN ('Mahmudlhasan429@gmail.com', 'marcocarinci.ecosun@gmail.com')
ORDER BY t.nome;
```

## Solución Alternativa: Script Node.js

Si prefieres usar el script Node.js:

1. **Instalar dependencias** (si no están instaladas):
   ```bash
   npm install
   ```

2. **Generar Prisma Client**:
   ```bash
   npx prisma generate
   ```
   O si npx no funciona:
   ```bash
   npm run prisma:generate
   ```

3. **Ejecutar el script**:
   ```bash
   node scripts/fixTecnicos.js
   ```

## Verificación

Después de ejecutar cualquiera de las soluciones, verifica que los usuarios aparezcan:

1. En la página de **Registri** (Registros)
2. En la página de **Test**

Los usuarios deberían aparecer en los dropdowns de selección de técnicos.

## Notas

- Los emails en la base de datos pueden estar almacenados en minúsculas. El script SQL busca exactamente como se proporcionaron.
- Si los usuarios no existen en la base de datos, primero deben ser creados a través del sistema de registro.
- El script SQL usa `ON CONFLICT DO NOTHING` para evitar errores si el técnico ya existe.


