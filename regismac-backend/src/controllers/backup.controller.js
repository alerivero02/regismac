import { backupDatabase } from '../../scripts/backup-database-postgres.js';
import { logSecurityEvent, SecurityEventType } from '../utils/securityLogger.js';

// Variable para evitar ejecuciones simultáneas
let isBackupRunning = false;
let lastBackupTime = null;
let lastBackupError = null;

/**
 * Ejecutar backup manual (requiere admin)
 */
export const executeBackup = async (req, res) => {
  try {
    // Verificar que no haya un backup en ejecución
    if (isBackupRunning) {
      return res.status(429).json({
        error: 'Backup en progreso',
        message: 'Ya hay un backup en ejecución. Por favor espera.',
      });
    }

    // Marcar como en ejecución
    isBackupRunning = true;

    // Log de seguridad
    logSecurityEvent(SecurityEventType.ADMIN_ACTION, {
      action: 'backup_executed',
      user: req.user?.id_usuario,
      ip: req.ip,
    });

    console.log('🔄 Iniciando backup manual...');
    
    // Ejecutar backup
    const backupPath = await backupDatabase();
    
    // Actualizar estado
    lastBackupTime = new Date();
    lastBackupError = null;
    
    // Obtener información del archivo
    const fs = await import('fs');
    const path = await import('path');
    const stats = fs.statSync(backupPath);
    
    res.json({
      success: true,
      message: 'Backup creado exitosamente',
      backup: {
        path: backupPath,
        filename: path.basename(backupPath),
        size: stats.size,
        sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
        timestamp: lastBackupTime.toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error al ejecutar backup:', error);
    lastBackupError = {
      message: error.message,
      timestamp: new Date().toISOString(),
    };
    
    res.status(500).json({
      error: 'Error al crear backup',
      message: error.message,
    });
  } finally {
    // Liberar flag
    isBackupRunning = false;
  }
};

/**
 * Obtener estado de los backups
 */
export const getBackupStatus = async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = path;
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const BACKUP_DIR = path.join(__dirname, '../../backups');
    
    // Listar backups disponibles
    let backups = [];
    if (fs.existsSync(BACKUP_DIR)) {
      backups = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('regismac_backup_') && file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(BACKUP_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            size: stats.size,
            sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          };
        })
        .sort((a, b) => b.modifiedAt - a.modifiedAt) // Más recientes primero
        .slice(0, 10); // Solo últimos 10
    }
    
    res.json({
      isRunning: isBackupRunning,
      lastBackupTime: lastBackupTime?.toISOString() || null,
      lastBackupError: lastBackupError,
      backups: backups,
      backupsCount: backups.length,
    });
  } catch (error) {
    console.error('❌ Error al obtener estado de backups:', error);
    res.status(500).json({
      error: 'Error al obtener estado',
      message: error.message,
    });
  }
};
