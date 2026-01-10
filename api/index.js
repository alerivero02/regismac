import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const path = req.url;
    
    if (path === '/api/auth/me' || path.startsWith('/api/auth/me')) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    if (path === '/api/usuarios/login' || path.startsWith('/api/usuarios/login')) {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
      }

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
    }
    
    return res.status(404).json({ error: 'Ruta no encontrada' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
