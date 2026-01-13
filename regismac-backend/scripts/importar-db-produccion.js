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

// Función para descargar backup desde producción (si tienes acceso SSH o API)
// Por ahora, asumimos que tienes un archivo SQL de backup
async function importarBackup(backupPath) {
  try {
    // Verificar que el archivo existe
    if (!fs.existsSync(backupPath)) {
      throw new Error(`El archivo de backup no existe: ${backupPath}`);
    }

    // Obtener DATABASE_URL del .env local
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL no está configurada en .env');
    }

    // Parsear DATABASE_URL
    const cleanUrl = dbUrl.replace(/^["']|["']$/g, '');
    let user, password, host, port, database;

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
        throw new Error('Formato de DATABASE_URL no válido');
      }
    }

    console.log('📥 Importando backup a la base de datos local...');
    console.log(`   Base de datos: ${database}`);
    console.log(`   Host: ${host}:${port}`);

    // Construir comando mysql
    let mysqlCommand;
    if (password) {
      mysqlCommand = `mysql -h ${host} -P ${port} -u ${user} -p${password} ${database} < "${backupPath}"`;
    } else {
      mysqlCommand = `mysql -h ${host} -P ${port} -u ${user} ${database} < "${backupPath}"`;
    }

    // Intentar con diferentes rutas de mysql
    const mysqlPaths = [
      'mysql', // En PATH
      'C:\\xampp\\mysql\\bin\\mysql.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe',
    ];

    let success = false;
    for (const mysqlPath of mysqlPaths) {
      try {
        const fullCommand = mysqlPath.includes('mysql.exe') 
          ? `"${mysqlPath}" -h ${host} -P ${port} -u ${user} ${password ? `-p${password}` : ''} ${database} < "${backupPath}"`
          : `${mysqlPath} -h ${host} -P ${port} -u ${user} ${password ? `-p${password}` : ''} ${database} < "${backupPath}"`;

        console.log(`   Intentando con: ${mysqlPath}...`);
        
        // En Windows, necesitamos usar cmd para redirección
        if (process.platform === 'win32') {
          await execAsync(`cmd /c "${fullCommand}"`, { 
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
          });
        } else {
          await execAsync(fullCommand, { 
            maxBuffer: 10 * 1024 * 1024 
          });
        }
        
        success = true;
        console.log('✅ Backup importado exitosamente!');
        break;
      } catch (error) {
        // Continuar con el siguiente path
        continue;
      }
    }

    if (!success) {
      throw new Error('No se pudo encontrar mysql. Asegúrate de que MySQL esté instalado y en el PATH, o que XAMPP esté instalado.');
    }

  } catch (error) {
    console.error('❌ Error al importar backup:', error.message);
    throw error;
  }
}

// Función principal
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('📋 Uso: node importar-db-produccion.js <ruta-al-backup.sql>');
      console.log('');
      console.log('Ejemplos:');
      console.log('  node importar-db-produccion.js backups/regismac_backup_2025-01-13T12-00-00.sql');
      console.log('  node importar-db-produccion.js C:\\ruta\\completa\\backup.sql');
      console.log('');
      console.log('Backups disponibles:');
      
      // Listar backups disponibles
      if (fs.existsSync(BACKUP_DIR)) {
        const backups = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.endsWith('.sql'))
          .sort()
          .reverse();
        
        if (backups.length > 0) {
          backups.slice(0, 5).forEach((backup, index) => {
            console.log(`  ${index + 1}. ${backup}`);
          });
        } else {
          console.log('  (No hay backups disponibles)');
        }
      }
      
      process.exit(1);
    }

    const backupPath = path.isAbsolute(args[0]) 
      ? args[0] 
      : path.join(process.cwd(), args[0]);

    await importarBackup(backupPath);
    
    console.log('');
    console.log('✅ Proceso completado!');
    console.log('   Ahora puedes iniciar el servidor con: npm run dev');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

