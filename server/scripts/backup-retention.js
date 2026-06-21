import { backupService } from '../services/backupService.js';

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '100', 10);

async function cleanupOldBackups() {
  console.log(`[backup-retention] Starting cleanup (retention: ${RETENTION_DAYS} days, max: ${MAX_BACKUPS} backups)`);
  try {
    await backupService.applyRetentionPolicy();
    const history = await backupService.getBackupHistory();
    if (history.length > MAX_BACKUPS) {
      const toRemove = history
        .sort((a, b) => a.date - b.date)
        .slice(0, history.length - MAX_BACKUPS);
      for (const b of toRemove) {
        try {
          await backupService.deleteBackupFile(b.key);
          console.log(`[backup-retention] Removed excess backup: ${b.key}`);
        } catch (err) {
          console.error(`[backup-retention] Failed to remove ${b.key}:`, err.message);
        }
      }
    }
    console.log(`[backup-retention] Cleanup complete. Total backups: ${history.length}`);
  } catch (err) {
    console.error(`[backup-retention] Cleanup failed:`, err.message);
    process.exit(1);
  }
}

cleanupOldBackups();
