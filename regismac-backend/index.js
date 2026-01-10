import 'dotenv/config';
import os from 'os';
import app from "./src/app.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

app.locals.prisma = prisma;

export async function reconnectPrisma() {
  try {
    await prisma.$disconnect();
    await prisma.$connect();
    console.log('✅ Reconexión a la base de datos exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error al reconectar:', error);
    return false;
  }
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || 
            iface.address.startsWith('10.') ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(iface.address)) {
          return iface.address;
        }
      }
    }
  }
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Connessione al database stabilita");
    
    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '0.0.0.0';
    const localIP = getLocalIP();
    
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server avviato su http://localhost:${PORT}`);
      console.log(`🌐 Accessibile dalla rete locale: http://${localIP}:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Errore nella connessione al database:", error.message);
    console.error("\n💡 Verifica:");
    console.error("   1. Che MySQL sia in esecuzione");
    console.error("   2. Che la configurazione in .env sia corretta");
    console.error("   3. Che il database 'regismac' esista");
    console.error(`\n   DATABASE_URL attuale: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@') : 'Non configurata'}`);
    console.error("\n💡 Esegui 'npm run verificar-env' per verificare la configurazione del .env");
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
