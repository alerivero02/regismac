import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import cors from 'cors';

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

app.get('/api/auth/me', (req, res) => {
  res.status(401).json({ error: 'No autenticado' });
});

app.post('/api/usuarios/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (usuario.estado !== 'aprobado') {
      return res.status(403).json({ error: 'Usuario pendiente de aprobación' });
    }

    const validPassword = await bcrypt.compare(password, usuario.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    return res.status(200).json({
      id: usuario.id_usuario,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
      foto: usuario.foto
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
