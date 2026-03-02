# RegisMAC

Sistema de gestión de producción RegisMAC

## Deployment

Aplicación desplegada en Vercel con base de datos PostgreSQL en Neon.

## Desarrollo Local

```bash
# Backend
cd regismac-backend
npm install
npm run dev

# Frontend
cd regismac-frontend
npm install
npm run dev
```

## Demo frontend para portfolio

Para una demo solo frontend (sin depender del backend ni de la base de datos) se añadió un **modo demo** en `regismac-frontend`:

- Los datos (máquinas, tests, materiales, órdenes y usuario actual) se simulan en memoria.
- No se realizan llamadas reales al backend ni se modifican datos en producción.

### Ejecutar la demo en local

```bash
cd regismac-frontend
npm install
npm run dev:demo
```

La app se abrirá en modo demo y mostrará un banner superior indicando que se trata de **“Demo frontend – Datos simulados”**.

### Build para despliegue estático de la demo

```bash
cd regismac-frontend
npm run build:demo
```

El resultado estático quedará en `regismac-frontend/dist` y puede desplegarse en cualquier hosting estático (Vercel, Netlify, etc.). Para Vercel, basta con:

- Crear un nuevo proyecto apuntando a este repo.
- Configurar como directorio de salida `regismac-frontend/dist`.
- Definir el comando de build como `cd regismac-frontend && npm install && npm run build:demo`.

