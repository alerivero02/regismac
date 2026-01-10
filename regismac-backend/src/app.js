import express from "express";
import cors from "cors";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import passport from "./config/passport.js";

import maquinasRoutes from "./routes/maquinas.routes.js";
import tecnicosRoutes from "./routes/tecnicos.routes.js";
import testsRoutes from "./routes/tests.routes.js";
import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import materialiRoutes from "./routes/materiali.routes.js";
import ordiniMaterialiRoutes from "./routes/ordiniMateriali.routes.js";
import lottiRoutes from "./routes/lotti.routes.js";

import { errorHandler } from "./utils/errorHandler.js";

const app = express();

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: isDevelopment ? false : { policy: "same-origin" },
  originAgentCluster: false,
}));

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR CRÍTICO: SESSION_SECRET no está configurado. Esto es un riesgo de seguridad.');
  // En serverless, no podemos usar process.exit, solo lanzar error
  throw new Error('SESSION_SECRET no está configurado');
}
app.use(cors({
  origin: isDevelopment ? true : process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const enableRateLimit = isDevelopment 
  ? process.env.ENABLE_RATE_LIMIT === 'true' 
  : true;

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  message: 'Troppi tentativi, riprova più tardi.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !enableRateLimit,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 50 : 5,
  message: 'Troppi tentativi di accesso, riprova tra 15 minuti.',
  skipSuccessfulRequests: true,
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
  // En serverless, no podemos usar process.exit, solo lanzar error
  throw new Error('SESSION_SECRET debe estar configurado en producción');
}

app.use(session({
  secret: sessionSecret,
  resave: true,
  saveUninitialized: true,
  name: 'regismac.sid',
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isDevelopment ? false : 'lax',
    path: '/',
    domain: undefined,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/maquinas", maquinasRoutes);
app.use("/api/tecnicos", tecnicosRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/materiali", materialiRoutes);
app.use("/api/ordini-materiali", ordiniMaterialiRoutes);
app.use("/api/lotti", lottiRoutes);

app.use(errorHandler);

export default app;
