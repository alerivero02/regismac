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
    
    // Extraer configuración de DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL no está configurada en .env');
    }
    
    // Parsear DATABASE_URL: mysql://user:password@host:port/database o mysql://user@host:port/database
    let user, password, host, port, database;
    
    // Remover comillas si las tiene
    const cleanUrl = dbUrl.replace(/^["']|["']$/g, '');
    
    // Intentar diferentes formatos
    // Formato: mysql://user:password@host:port/database
    const urlMatch1 = cleanUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (urlMatch1 && urlMatch1[2]) {
      [, user, password, host, port, database] = urlMatch1;
    } else {
      // Formato: mysql://user:@host:port/database (password vacío)
      const urlMatch2 = cleanUrl.match(/mysql:\/\/([^:]+):@([^:]+):(\d+)\/(.+)/);
      if (urlMatch2) {
        [, user, host, port, database] = urlMatch2;
        password = '';
      } else {
        // Formato: mysql://user@host:port/database (sin password)
        const urlMatch3 = cleanUrl.match(/mysql:\/\/([^:@]+)@([^:]+):(\d+)\/(.+)/);
        if (urlMatch3) {
          [, user, host, port, database] = urlMatch3;
          password = '';
        } else {
          throw new Error(`Formato de DATABASE_URL inválido: ${cleanUrl}`);
        }
      }
    }
    
    console.log('🔄 Iniciando backup de la base de datos...');
    console.log(`   Base de datos: ${database}`);
    console.log(`   Host: ${host}:${port}`);
    
    // Comando mysqldump
    let mysqlPath;
    if (process.platform === 'win32') {
      const xamppPath = `C:\\Program Files\\xampp\\mysql\\bin\\mysqldump.exe`;
      if (fs.existsSync(xamppPath)) {
        mysqlPath = xamppPath;
      } else {
        mysqlPath = 'mysqldump';
      }
    } else {
      mysqlPath = 'mysqldump';
    }
    
    // Construir comando mysqldump
    const passwordPart = password ? `-p${password}` : '';
    const dumpArgs = [
      `-h${host}`,
      `-P${port}`,
      `-u${user}`,
      passwordPart,
      database
    ].filter(arg => arg).join(' ');
    
    // Crear stream de escritura para el backup
    const writeStream = fs.createWriteStream(backupPath);
    
    // Ejecutar mysqldump y escribir directamente al archivo
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const mysqldump = spawn(mysqlPath, [
        `-h${host}`,
        `-P${port}`,
        `-u${user}`,
        ...(password ? [`-p${password}`] : []),
        database
      ], {
        env: { ...process.env, MYSQL_PWD: password },
        shell: false
      });
      
      mysqldump.stdout.pipe(writeStream);
      
      mysqldump.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        if (!errorMsg.includes('Warning')) {
          console.error('Error mysqldump:', errorMsg);
        }
      });
      
      mysqldump.on('close', async (code) => {
        writeStream.end();
        
        if (code !== 0) {
          reject(new Error(`mysqldump terminó con código ${code}`));
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
      
      mysqldump.on('error', (error) => {
        writeStream.end();
        reject(error);
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

if (isMainModule || process.argv[1]?.includes('backup-database.js')) {
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

