import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.get('/api/auth/me', (req, res) => {
  res.status(401).json({ error: 'No autenticado' });
});

app.post('/api/usuarios/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatori' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    if (usuario.estado !== 'aprobado') {
      const mensaje = usuario.estado === 'pendiente' 
        ? "Il tuo account è in attesa di approvazione" 
        : "Il tuo account è stato rifiutato";
      return res.status(403).json({ error: mensaje });
    }

    if (!usuario.password) {
      return res.status(401).json({ 
        error: 'Questo account non ha una password impostata. Accedi con Google oppure imposta una password dal tuo profilo.' 
      });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const { password: _, ...usuarioSinPassword } = usuario;
    
    return res.json({
      message: 'Accesso effettuato con successo',
      usuario: usuarioSinPassword
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

export default app;
