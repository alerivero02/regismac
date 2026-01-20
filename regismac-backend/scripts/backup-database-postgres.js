import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 30; // Mantener últimos 30 backups

// Crear directorio de backups si no existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `regismac_backup_${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    // Obtener DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL no está configurada en .env');
    }
    
    console.log('🔄 Iniciando backup de la base de datos PostgreSQL...');
    console.log(`   Archivo: ${backupFileName}`);
    
    // Verificar que pg_dump esté disponible
    try {
      await execAsync('pg_dump --version');
    } catch (error) {
      throw new Error('pg_dump no está disponible. Asegúrate de tener PostgreSQL instalado o usar el cliente de PostgreSQL.');
    }
    
    // Ejecutar pg_dump usando spawn para mejor manejo de streams
    const { spawn } = await import('child_process');
    const writeStream = fs.createWriteStream(backupPath);
    
    return new Promise((resolve, reject) => {
      // Parsear DATABASE_URL para extraer parámetros
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1); // Remover el '/' inicial
      const user = url.username;
      const password = url.password;
      
      // Construir comando pg_dump
      const pgDumpArgs = [
        '-h', host,
        '-p', port,
        '-U', user,
        '-d', database,
        '-F', 'p', // Formato plain text
        '-f', backupPath
      ];
      
      // Si hay password, usar variable de entorno
      const env = { ...process.env };
      if (password) {
        env.PGPASSWORD = password;
      }
      
      const pgDump = spawn('pg_dump', pgDumpArgs, {
        env: env,
        shell: false
      });
      
      pgDump.stdout.pipe(writeStream);
      
      pgDump.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        // Algunos warnings son normales, solo loguear errores reales
        if (!errorMsg.includes('WARNING') && !errorMsg.includes('NOTICE')) {
          console.error('pg_dump stderr:', errorMsg);
        }
      });
      
      pgDump.on('close', async (code) => {
        writeStream.end();
        
        if (code !== 0) {
          reject(new Error(`pg_dump terminó con código ${code}`));
          return;
        }
        
        // Esperar a que el archivo se escriba completamente
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar que el archivo se creó y tiene contenido
        if (!fs.existsSync(backupPath)) {
          reject(new Error('El archivo de backup no se creó'));
          return;
        }
        
        const stats = fs.statSync(backupPath);
        if (stats.size === 0) {
          reject(new Error('El archivo de backup está vacío'));
          return;
        }
        
        console.log(`✅ Backup creado exitosamente: ${backupFileName}`);
        console.log(`   Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`   Ubicación: ${backupPath}`);
        
        // Limpiar backups antiguos
        await cleanOldBackups();
        
        resolve(backupPath);
      });
      
      pgDump.on('error', (error) => {
        writeStream.end();
        reject(new Error(`Error al ejecutar pg_dump: ${error.message}`));
      });
    });
  } catch (error) {
    console.error('❌ Error al crear backup:', error.message);
    throw error;
  }
}

async function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('regismac_backup_') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Más recientes primero
    
    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      console.log(`\n🧹 Eliminando ${toDelete.length} backup(s) antiguo(s)...`);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        console.log(`   Eliminado: ${file.name}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Error al limpiar backups antiguos:', error.message);
  }
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1]}` || process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || process.argv[1]?.includes('backup-database-postgres.js')) {
  backupDatabase()
    .then(() => {
      console.log('\n✅ Proceso de backup completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en el proceso de backup:', error.message);
      process.exit(1);
    });
}

export { backupDatabase };
