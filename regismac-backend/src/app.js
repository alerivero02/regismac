import express from "express";
import cors from "cors";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import passport from "./config/passport.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import maquinasRoutes from "./routes/maquinas.routes.js";
import tecnicosRoutes from "./routes/tecnicos.routes.js";
import testsRoutes from "./routes/tests.routes.js";
import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import materialiRoutes from "./routes/materiali.routes.js";
import ordiniMaterialiRoutes from "./routes/ordiniMateriali.routes.js";
import lottiRoutes from "./routes/lotti.routes.js";
import sensorRoutes from "./routes/sensor.routes.js";
import backupRoutes from "./routes/backup.routes.js";

import { errorHandler } from "./utils/errorHandler.js";
import { 
  sanitizeBody, 
  sanitizeQuery, 
  sanitizeParams, 
  preventPathTraversal,
  validatePayloadSize,
  allowedMethods
} from "./middleware/security.js";
import { logSecurityEvent, SecurityEventType } from "./utils/securityLogger.js";

const app = express();

const isDevelopment = process.env.NODE_ENV !== 'production';

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: isDevelopment ? false : { policy: "same-origin" },
  originAgentCluster: false,
}));

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.error('❌ WARNING: SESSION_SECRET no está configurado.');
}
// Configuración de CORS
// En producción con Render, el frontend y backend están en el mismo dominio
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : (isDevelopment 
      ? ['http://localhost:5173', 'http://localhost:3000'] 
      : null // null significa permitir el mismo origen en producción
    );

app.use(cors({
  origin: (origin, callback) => {
    // En desarrollo, permitir localhost
    if (isDevelopment) {
      // Permitir requests sin origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      // Permitir localhost en desarrollo
      if (allowedOrigins && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Permitir cualquier localhost en desarrollo
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // En producción
    if (!isDevelopment) {
      // Si ALLOWED_ORIGINS está configurado, usar esa lista
      if (allowedOrigins && allowedOrigins.length > 0) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
            reason: 'CORS origin not allowed',
            origin,
            allowedOrigins
          });
          return callback(new Error('No permitido por CORS'));
        }
      }
      
      // Si no hay ALLOWED_ORIGINS configurado, permitir el mismo origen
      // Esto es útil cuando frontend y backend están en el mismo dominio (Render)
      if (!origin) {
        // Requests sin origin (mismo origen) están permitidos
        return callback(null, true);
      }
      
      // Verificar si el origen coincide con BACKEND_URL o FRONTEND_URL
      const backendUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL;
      if (backendUrl) {
        try {
          const backendOrigin = new URL(backendUrl).origin;
          if (origin === backendOrigin) {
            return callback(null, true);
          }
        } catch (e) {
          // Si hay error parseando la URL, continuar
        }
      }
      
      // Por defecto, permitir en producción si no hay configuración específica
      // Esto permite que funcione cuando frontend y backend están en el mismo dominio
      return callback(null, true);
    }
    
    // Fallback: denegar
    callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 horas
}));

// Validar tamaño de payload antes de parsear
app.use(validatePayloadSize(50 * 1024 * 1024)); // 50MB

app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    // Solo verificar JSON si hay contenido
    if (buf && buf.length > 0) {
      try {
        const text = buf.toString();
        // Ignorar buffers vacíos o solo espacios
        if (text.trim().length === 0) {
          return;
        }
        JSON.parse(text);
      } catch (e) {
        // Solo loguear si no es un error esperado (como body vacío en GET)
        if (req.method !== 'GET' && req.method !== 'DELETE') {
          logSecurityEvent(SecurityEventType.INVALID_INPUT, {
            reason: 'Invalid JSON payload',
            path: req.path,
            error: e.message
          });
        }
        // No lanzar error para evitar romper el flujo, Express manejará el error
      }
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Aplicar sanitización a todas las rutas
app.use(sanitizeBody);
app.use(sanitizeQuery);
app.use(sanitizeParams);
app.use(preventPathTraversal);

// Rate limiting - Habilitado por defecto en producción, deshabilitable con DISABLE_RATE_LIMIT=true
const disableRateLimit = process.env.DISABLE_RATE_LIMIT === 'true';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 1000 : 500, // Más restrictivo en producción
  message: 'Troppi tentativi, riprova più tardi.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => disableRateLimit || req.path.startsWith('/api/sensor'), // Sensor: límite propio (sensorLimiter)
  handler: (req, res) => {
    logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Troppi tentativi',
      message: 'Hai superato il limite di richieste. Riprova più tardi.',
      retryAfter: 15
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 50 : 20, // Más restrictivo para autenticación
  message: {
    error: 'Troppi tentativi di accesso',
    message: 'Hai superato il limite di tentativi di accesso. Riprova tra 15 minuti o usa l\'accesso con Google.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar intentos exitosos
  skipFailedRequests: false, // Contar intentos fallidos
  skip: () => disableRateLimit,
  handler: (req, res) => {
    logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      ip: req.ip,
      path: req.path,
      method: req.method,
      type: 'auth'
    });
    res.status(429).json({
      error: 'Troppi tentativi di accesso',
      message: 'Hai superato il limite di tentativi di accesso. Riprova tra 15 minuti.',
      retryAfter: 15
    });
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 100 : 30, // Muy restrictivo para endpoints sensibles
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => disableRateLimit,
  handler: (req, res) => {
    logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      ip: req.ip,
      path: req.path,
      method: req.method,
      type: 'strict'
    });
    res.status(429).json({
      error: 'Troppi tentativi',
      message: 'Hai superato il limite di richieste per questo endpoint.',
      retryAfter: 15
    });
  }
});

// Sensor: límite alto para polling (frontend) y envío ESP32 en tiempo real
const sensorLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 1200, // ~20 req/s por IP (polling 100ms + ESP32 200ms)
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => disableRateLimit,
  handler: (req, res) => {
    logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      ip: req.ip,
      path: req.path,
      method: req.method,
      type: 'sensor'
    });
    res.status(429).json({
      error: 'Troppi tentativi',
      message: 'Limite sensor superato. Riprova tra un minuto.',
      retryAfter: 60
    });
  }
});

if (!disableRateLimit) {
  app.use('/api/sensor', sensorLimiter);
  app.use('/api/', generalLimiter);
  app.use('/api/auth/', authLimiter);
  app.use('/api/usuarios/login', authLimiter);
  app.use('/api/usuarios/registro', authLimiter);
  // Rate limiting estricto para endpoints administrativos
  app.use('/api/usuarios', strictLimiter);
  app.use('/api/admin', strictLimiter);
}

const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret-key-change-in-production');

if (!sessionSecret) {
  console.error('❌ ERROR: SESSION_SECRET debe estar configurado en producción');
  console.error('⚠️  Usando secret temporal - NO SEGURO PARA PRODUCCIÓN');
}

if (sessionSecret) {
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'regismac.sid',
    proxy: process.env.NODE_ENV === 'production',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : false,
      path: '/',
    },
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
} else {
  console.error('❌ No se puede configurar sesiones sin SESSION_SECRET');
  app.use(passport.initialize());
}

// Timeout middleware - terminar requests que tardan más de 30 segundos
app.use((req, res, next) => {
  const timeout = 30000; // 30 segundos
  req.setTimeout(timeout, () => {
    if (!res.headersSent) {
      logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
        reason: 'Request timeout',
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      res.status(408).json({
        error: 'Timeout',
        message: 'La petición tardó demasiado tiempo'
      });
    }
  });
  next();
});

// Endpoint de health check para mantener la app activa en Render
// Este endpoint debe ser llamado periódicamente (cada 5-10 minutos) para evitar que Render duerma el servicio
app.get("/api/health", async (req, res) => {
  // Verificar conexión a la base de datos
  let dbStatus = 'unknown';
  try {
    await req.app.locals.prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
    // Intentar reconectar si hay error
    if (error.code === 'P1001' || error.code === 'P1002' || error.code === 'P1017' || 
        (error.message && error.message.includes('terminating connection'))) {
      try {
        await req.app.locals.prisma.$disconnect();
        await req.app.locals.prisma.$connect();
        dbStatus = 'reconnected';
      } catch (reconnectError) {
        // Ignorar errores de reconexión en health check
      }
    }
  }
  
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "regismac",
    database: dbStatus
  });
});

// Rutas de API primero (deben tener prioridad sobre el frontend)
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/maquinas", maquinasRoutes);
app.use("/api/tecnicos", tecnicosRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/materiali", materialiRoutes);
app.use("/api/ordini-materiali", ordiniMaterialiRoutes);
app.use("/api/lotti", lottiRoutes);
app.use("/api/sensor", sensorRoutes);
app.use("/api/backup", backupRoutes);

// En producción (Render), servir el frontend después de las rutas de API
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', '..', 'regismac-frontend', 'dist');
  
  // Servir archivos estáticos del frontend (CSS, JS, imágenes, etc.)
  // Esto DEBE ir antes del middleware que sirve index.html
  app.use(express.static(frontendPath, {
    maxAge: '1y', // Cache estático por 1 año
    etag: true,
    lastModified: true,
    index: false, // No servir index.html automáticamente
    fallthrough: true // Continuar al siguiente middleware si el archivo no existe
  }));
  
  // Servir index.html para todas las rutas GET que no sean /api/* y no sean archivos estáticos
  // Esto debe ir DESPUÉS de express.static para que solo capture rutas que no encontraron archivo
  app.use((req, res, next) => {
    // Si la ruta empieza con /api, pasar al siguiente middleware (404)
    if (req.path.startsWith('/api')) {
      return next();
    }
    
    // Solo procesar peticiones GET
    if (req.method !== 'GET') {
      return next();
    }
    
    // Verificar si es un archivo estático (tiene extensión)
    // Si express.static no encontró el archivo, esta ruta no debería tener extensión
    const hasExtension = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map|json)$/i.test(req.path);
    if (hasExtension) {
      // Si tiene extensión pero express.static no lo encontró, devolver 404
      return res.status(404).json({
        error: 'Archivo no encontrado',
        path: req.path
      });
    }
    
    // Para todas las demás rutas GET (sin extensión), servir el frontend SPA
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error al servir index.html:', err);
        // Si hay error, devolver 404 en lugar de pasar al siguiente middleware
        if (!res.headersSent) {
          res.status(404).json({
            error: 'Frontend no encontrado',
            message: 'El archivo index.html no existe en la ruta del frontend'
          });
        }
      }
    });
  });
} else {
  // En desarrollo, mostrar mensaje de API en la raíz
  app.get("/", (req, res) => {
    res.json({ 
      status: "ok", 
      service: "regismac",
      message: "RegisMAC API is running",
      environment: "development"
    });
  });
}

app.use((req, res, next) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.method} ${req.path} no existe`,
    path: req.path,
    method: req.method
  });
});

app.use(errorHandler);

export default app;
