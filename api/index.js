import 'dotenv/config';
import app from '../regismac-backend/src/app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

app.locals.prisma = prisma;

export default app;
