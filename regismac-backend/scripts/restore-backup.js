import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '../../backups');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('❌ No existe el directorio de backups');
    return [];
  }
  
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('regismac_backup_') && file.endsWith('.sql'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      time: fs.statSync(path.join(BACKUP_DIR, file)).mtime,
      size: fs.statSync(path.join(BACKUP_DIR, file)).size
    }))
    .sort((a, b) => b.time - a.time);
  
  return files;
}

async function restoreBackup(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error('El archivo de backup no existe');
    }
    
    // Extraer configuración de DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL no está configurada en .env');
    }
    
    const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
      throw new Error('Formato de DATABASE_URL inválido');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    console.log('🔄 Restaurando backup...');
    console.log(`   Archivo: ${path.basename(backupPath)}`);
    console.log(`   Base de datos: ${database}`);
    console.log(`   Host: ${host}:${port}`);
    console.log('\n⚠️  ADVERTENCIA: Esto sobrescribirá todos los datos actuales!');
    
    const confirm = await question('¿Estás seguro? (escribe "SI" para confirmar): ');
    if (confirm !== 'SI') {
      console.log('❌ Restauración cancelada');
      rl.close();
      return;
    }
    
    const mysqlPath = process.platform === 'win32' 
      ? `"C:\\Program Files\\xampp\\mysql\\bin\\mysql.exe"`
      : 'mysql';
    
    const restoreCommand = `${mysqlPath} -h${host} -P${port} -u${user} ${password ? `-p${password}` : ''} ${database} < "${backupPath}"`;
    
    await execAsync(restoreCommand, { 
      shell: true,
      env: { ...process.env, MYSQL_PWD: password }
    });
    
    console.log('✅ Backup restaurado exitosamente');
    console.log('💡 Ejecuta "npx prisma generate" para actualizar el cliente de Prisma');
    
  } catch (error) {
    console.error('❌ Error al restaurar backup:', error.message);
    throw error;
  } finally {
    rl.close();
  }
}

async function main() {
  const backups = await listBackups();
  
  if (backups.length === 0) {
    console.log('❌ No se encontraron backups');
    rl.close();
    return;
  }
  
  console.log('\n📋 Backups disponibles:\n');
  backups.forEach((backup, index) => {
    const sizeKB = (backup.size / 1024).toFixed(2);
    console.log(`${index + 1}. ${backup.name}`);
    console.log(`   Fecha: ${backup.time.toLocaleString()}`);
    console.log(`   Tamaño: ${sizeKB} KB\n`);
  });
  
  const choice = await question(`Selecciona un backup (1-${backups.length}) o escribe la ruta completa: `);
  
  let backupPath;
  if (choice.match(/^\d+$/)) {
    const index = parseInt(choice) - 1;
    if (index < 0 || index >= backups.length) {
      console.log('❌ Selección inválida');
      rl.close();
      return;
    }
    backupPath = backups[index].path;
  } else {
    backupPath = choice;
  }
  
  await restoreBackup(backupPath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export { restoreBackup, listBackups };

