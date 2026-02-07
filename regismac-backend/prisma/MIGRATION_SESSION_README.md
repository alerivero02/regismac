# Migración: control de sesión única

Se ha añadido el campo `current_session_id` al modelo `Usuario` para permitir una sola sesión activa por cuenta.

**Cuando tengas la base de datos configurada, ejecuta:**

```bash
cd regismac-backend
npx prisma migrate dev --name add_current_session_id
```

O si usas `db push`:

```bash
npx prisma db push
```

Esto añadirá la columna `current_session_id` (nullable) a la tabla `Usuario`.
