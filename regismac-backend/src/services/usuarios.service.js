import bcrypt from 'bcryptjs';

export class UsuariosService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      orderBy: { fecha_registro: 'desc' },
      include: {
        aprobador: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
      },
    });
  }

  async findById(id) {
    return this.prisma.usuario.findUnique({
      where: { id_usuario: id },
      include: {
        aprobador: {
          select: {
            id_usuario: true,
            nombre: true,
            email: true,
          },
        },
      },
    });
  }

  async findByEmail(email) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findByGoogleId(googleId) {
    return this.prisma.usuario.findUnique({
      where: { google_id: googleId },
    });
  }

  async create(data) {
    const prismaData = { ...data };
    
    // Si hay contraseña, hashearla
    if (prismaData.password) {
      prismaData.password = await bcrypt.hash(prismaData.password, 10);
    }
    // Si no hay contraseña y es usuario de Google, dejar password como null

    return this.prisma.usuario.create({
      data: prismaData,
    });
  }

  async update(id, data) {
    const prismaData = { ...data };
    
    // Si hay contraseña nueva, hashearla
    if (prismaData.password) {
      prismaData.password = await bcrypt.hash(prismaData.password, 10);
    }

    return this.prisma.usuario.update({
      where: { id_usuario: id },
      data: prismaData,
    });
  }

  async aprobarUsuario(id, aprobadoPor) {
    return this.prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        estado: 'aprobado',
        fecha_aprobacion: new Date(),
        aprobado_por: aprobadoPor,
      },
    });
  }

  async rechazarUsuario(id, aprobadoPor) {
    return this.prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        estado: 'rechazado',
        fecha_aprobacion: new Date(),
        aprobado_por: aprobadoPor,
      },
    });
  }

  async getPendientes() {
    return this.prisma.usuario.findMany({
      where: { estado: 'pendiente' },
      orderBy: { fecha_registro: 'desc' },
    });
  }

  async verificarPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updateRol(id, nuevoRol) {
    // Validar que el rol sea válido
    const rolesValidos = ['admin', 'tecnico', 'comercial'];
    if (!rolesValidos.includes(nuevoRol)) {
      throw new Error(`Rol non valido. I ruoli validi sono: ${rolesValidos.join(', ')}`);
    }

    return this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { rol: nuevoRol },
    });
  }

  async establecerPassword(id, password) {
    if (!password || password.length < 6) {
      throw new Error('La password deve contenere almeno 6 caratteri');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { password: hashedPassword },
    });
  }
}

