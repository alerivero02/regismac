import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import backendApp from './regismac-backend/src/app.js';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();

backendApp.locals.prisma = prisma;

app.use('/api', backendApp);

app.use(express.static(path.join(__dirname, 'regismac-frontend', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'regismac-frontend', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Backend API: http://localhost:${PORT}/api`);
  console.log(`📍 Frontend: http://localhost:${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando conexiones...');
  await prisma.$disconnect();
  process.exit(0);
});
