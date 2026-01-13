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

import { errorHandler } from "./utils/errorHandler.js";

const app = express();

const isDevelopment = process.env.NODE_ENV !== 'production';

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
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting DESHABILITADO por defecto en producción para evitar errores 429
// Solo se habilita si ENABLE_RATE_LIMIT está explícitamente en 'true'
const enableRateLimit = process.env.ENABLE_RATE_LIMIT === 'true';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 1000 : 1000, // Muy alto cuando está habilitado
  message: 'Troppi tentativi, riprova più tardi.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !enableRateLimit,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 100 : 500, // Muy alto cuando está habilitado
  message: {
    error: 'Troppi tentativi di accesso',
    message: 'Hai superato il limite di tentativi di accesso. Riprova tra 15 minuti o usa l\'accesso con Google.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar intentos exitosos
  skipFailedRequests: false, // Contar intentos fallidos
  skip: () => !enableRateLimit,
});

if (enableRateLimit) {
  app.use('/api/', generalLimiter);
  app.use('/api/auth/', authLimiter);
  app.use('/api/usuarios/login', authLimiter);
  app.use('/api/usuarios/registro', authLimiter);
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

// Endpoint de health check para mantener la app activa en Render
// Este endpoint debe ser llamado periódicamente (cada 5-10 minutos) para evitar que Render duerma el servicio
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "regismac"
  });
});

// En producción, servir el frontend primero antes de las rutas de API
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', '..', 'regismac-frontend', 'dist');
  
  // Servir archivos estáticos del frontend
  app.use(express.static(frontendPath));
  
  // Servir index.html para todas las rutas que no sean /api/*
  // Esto debe ir ANTES de las rutas de API para que tenga prioridad
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
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

// Rutas de API (solo se ejecutan si no coinciden con rutas del frontend)
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/maquinas", maquinasRoutes);
app.use("/api/tecnicos", tecnicosRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/materiali", materialiRoutes);
app.use("/api/ordini-materiali", ordiniMaterialiRoutes);
app.use("/api/lotti", lottiRoutes);
app.use("/api/sensor", sensorRoutes);

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
