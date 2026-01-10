# RegisMAC - Sistema de Registro de Máquinas

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

**Sistema completo de gestión y registro de máquinas para ECOSUN**

[Características](#-características) • [Instalación](#-instalación) • [Documentación](#-documentación) • [Soporte](#-soporte)

</div>

---

## 📋 Descripción

RegisMAC es un sistema web completo desarrollado para **ECOSUN** que permite gestionar el registro, pruebas y seguimiento de máquinas de refrigeración. El sistema incluye:

- ✅ Registro completo de máquinas con fotos
- ✅ Sistema de pruebas de temperatura automatizado
- ✅ Gestión de técnicos y usuarios
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión de materiales y órdenes de compra
- ✅ Sistema de autenticación con roles (Admin, Técnico, Comercial)
- ✅ Login con Google OAuth
- ✅ Alertas de stock de materiales

## ✨ Características

### 🔐 Autenticación y Seguridad
- Sistema de usuarios con roles (Admin, Técnico, Comercial)
- Login con email/password y Google OAuth
- Aprobación de usuarios por administrador
- Sesiones seguras con cookies httpOnly
- Rate limiting para protección contra ataques
- Headers de seguridad (Helmet.js)
- Validación de archivos con magic numbers

### 📊 Dashboard
- Estadísticas en tiempo real
- Vista de máquinas por estado
- Alertas de stock de materiales
- Métricas de producción
- Gráficos y visualizaciones

### 🏭 Gestión de Máquinas
- Registro completo con todos los datos técnicos
- Subida de hasta 2 fotos por máquina
- Historial de pruebas
- Estados automáticos basados en pruebas
- Filtros y búsqueda avanzada

### 🧪 Sistema de Pruebas
- Cronómetro integrado para pruebas de temperatura
- Entrada manual de tiempos (formato MM:SS)
- Validación automática de condiciones
- Actualización automática de estado de máquinas
- Asociación con técnicos

### 📦 Gestión de Materiales
- Control de stock (comprado, utilizado, disponible)
- Alertas de stock bajo/agotado
- Gestión de órdenes de compra
- Seguimiento de estados de órdenes
- Creación rápida de órdenes desde alertas

## 🚀 Instalación

### Requisitos Previos

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm o yarn

### Instalación Rápida

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd Portfolio
   ```

2. **Configurar Backend**
   ```bash
   cd regismac-backend
   npm install
   cp .env.example .env
   # Editar .env con tus credenciales
   npx prisma migrate dev
   npm run create-admin
   npm run dev
   ```

3. **Configurar Frontend**
   ```bash
   cd regismac-frontend
   npm install
   npm run dev
   ```

Para instrucciones detalladas, consulta [GUIA_CONFIGURACION_COMPLETA.md](./GUIA_CONFIGURACION_COMPLETA.md)

## 🌐 Deployment en Vercel

Para desplegar el proyecto en Vercel:

1. **Sube el proyecto a GitHub** (ver instrucciones abajo)
2. **Importa en Vercel** desde GitHub
3. **Configura las variables de entorno** en Vercel
4. **Despliega**

Para instrucciones detalladas, consulta [DEPLOYMENT_VERCEL.md](./DEPLOYMENT_VERCEL.md)

### Subir a GitHub

```bash
# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Hacer commit inicial
git commit -m "Initial commit: RegisMAC sistema completo"

# Conectar con GitHub (reemplaza TU_USUARIO y TU_REPO)
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

**⚠️ IMPORTANTE:** Asegúrate de que los archivos sensibles (`.env`, `client_secret_*.json`) estén en `.gitignore` antes de hacer commit.

## 📚 Documentación

### Documentos Disponibles

- **[Guía de Configuración Completa](./GUIA_CONFIGURACION_COMPLETA.md)** - Instalación paso a paso
- **[Instrucciones Rápidas](./INSTRUCCIONES_RAPIDAS.md)** - Inicio rápido
- **[Checklist de Producción](./CHECKLIST_PRODUCCION.md)** - Preparación para producción
- **[Análisis de Seguridad](./ANALISIS_SEGURIDAD.md)** - Revisión de seguridad
- **[Mejoras de Seguridad](./MEJORAS_SEGURIDAD_IMPLEMENTADAS.md)** - Mejoras implementadas
- **[Sistema de Usuarios](./README_SISTEMA_USUARIOS.md)** - Gestión de usuarios
- **[Configuración Google OAuth](./README_GOOGLE_SETUP.md)** - Setup de Google

### Estructura del Proyecto

```
Portfolio/
├── regismac-backend/          # Backend (Express.js + Prisma)
│   ├── src/
│   │   ├── controllers/       # Controladores
│   │   ├── routes/            # Rutas API
│   │   ├── services/          # Lógica de negocio
│   │   ├── middleware/        # Middlewares
│   │   └── config/            # Configuración
│   ├── prisma/                # Schema y migraciones
│   └── scripts/               # Scripts de utilidad
├── regismac-frontend/          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── pages/             # Páginas
│   │   ├── services/          # Servicios API
│   │   └── App.jsx            # Componente principal
│   └── public/                # Archivos estáticos
└── docs/                      # Documentación adicional
```

## 🛠️ Tecnologías

### Backend
- **Express.js** - Framework web
- **Prisma** - ORM para MySQL
- **Passport.js** - Autenticación
- **Multer** - Manejo de archivos
- **Helmet** - Seguridad
- **express-rate-limit** - Rate limiting
- **Zod** - Validación de esquemas

### Frontend
- **React 19** - Biblioteca UI
- **React Router** - Navegación
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **React Icons** - Iconos

## 📝 Scripts Disponibles

### Backend
```bash
npm run dev              # Desarrollo con hot reload
npm run start            # Producción
npm run create-admin     # Crear administrador
npm run import-maquinas  # Importar máquinas
npm run import-tests     # Importar pruebas
npm run migrate          # Ejecutar migraciones
```

### Frontend
```bash
npm run dev              # Desarrollo
npm run build            # Build para producción
npm run preview          # Preview del build
```

## 🔒 Seguridad

El sistema incluye múltiples capas de seguridad:

- ✅ Autenticación con sesiones seguras
- ✅ Rate limiting (100 req/15min general, 5/15min para auth)
- ✅ Headers de seguridad (Helmet.js)
- ✅ Validación de archivos (magic numbers)
- ✅ Protección CSRF básica
- ✅ Validación de entrada
- ✅ Passwords hasheados (bcrypt)

Ver [ANALISIS_SEGURIDAD.md](./ANALISIS_SEGURIDAD.md) para más detalles.

## 👥 Roles de Usuario

### Administrador
- Acceso completo al sistema
- Gestión de usuarios (aprobar, rechazar, cambiar roles)
- Todas las funcionalidades

### Técnico
- Registrar máquinas
- Realizar pruebas
- Ver registros
- Crear órdenes de materiales

### Comercial
- Gestión de materiales
- Gestión de órdenes
- Cambiar estados de órdenes
- Ver alertas de stock

## 📧 Soporte

Para soporte técnico o consultas:

- **Email**: al.rivero2021@gmail.com
- **Desarrollador**: Alexander Rivero

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Alexander Rivero**

- Email: al.rivero2021@gmail.com
- Desarrollado para ECOSUN

---

<div align="center">

**RegisMAC v1.0.0** - Sistema de Registro de Máquinas

© 2025 Alexander Rivero. Todos los derechos reservados.

</div>

