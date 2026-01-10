import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;

  try {
    // /api/auth/me
    if (url === '/api/auth/me' || url?.startsWith('/api/auth/me')) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // /api/usuarios/login
    if ((url === '/api/usuarios/login' || url?.startsWith('/api/usuarios/login')) && method === 'POST') {
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
          error: 'Questo account non ha una password impostata.' 
        });
      }

      const passwordValido = await bcrypt.compare(password, usuario.password);
      if (!passwordValido) {
        return res.status(401).json({ error: 'Credenziali non valide' });
      }

      const { password: _, ...usuarioSinPassword } = usuario;
      
      return res.status(200).json({
        message: 'Accesso effettuato con successo',
        usuario: usuarioSinPassword
      });
    }

    return res.status(404).json({ error: 'Ruta no encontrada' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
