const cron = require('node-cron');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const winston = require('winston');
const { uploadBackupToDropbox } = require('../services/dropboxBackupService');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const defaultCron = '0 8 * * *'; // 08:00 daily

function getBackupDir() {
  return process.env.DB_BACKUP_DIR || path.join(__dirname, '..', 'backups', 'db');
}

function getRetentionDays() {
  const raw = Number(process.env.BACKUP_RETENTION_DAYS || 14);
  return Number.isFinite(raw) && raw > 0 ? raw : 14;
}

function ensureBackupDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanupOldBackups(dirPath) {
  const retentionDays = getRetentionDays();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      if (!file.startsWith('railway_') || !file.endsWith('.sql.gz')) return;
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(fullPath);
      }
    });
  } catch (error) {
    logger.warn('Backup cleanup error', { error: error.message });
  }
}

function isDropboxEnabled() {
  return String(process.env.DB_BACKUP_DROPBOX_ENABLED || 'false').toLowerCase() === 'true';
}

async function runBackupOnce() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const DB_PORT = process.env.DB_PORT || '3306';

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    logger.error('DB backup skipped: missing env vars');
    return;
  }

  const backupDir = getBackupDir();
  ensureBackupDir(backupDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(backupDir, `railway_${timestamp}.sql.gz`);

  const dumpArgs = [
    '--protocol=TCP',
    `--host=${DB_HOST}`,
    `--port=${DB_PORT}`,
    `--user=${DB_USER}`,
    '--databases',
    DB_NAME,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--no-tablespaces',
    '--skip-add-drop-table'
  ];

  logger.info('Starting DB backup', { outFile });

  const dump = spawn('mysqldump', dumpArgs, {
    env: { ...process.env, MYSQL_PWD: DB_PASSWORD }
  });

  const spawnError = await new Promise(resolve => {
    dump.once('spawn', () => resolve(null));
    dump.once('error', err => resolve(err));
  });

  if (spawnError) {
    logger.error('mysqldump spawn failed', { error: spawnError.message });
    return;
  }

  const gzip = zlib.createGzip();
  const output = fs.createWriteStream(outFile);

  dump.stderr.on('data', data => {
    logger.error('mysqldump stderr', { message: data.toString() });
  });

  try {
    await pipeline(dump.stdout, gzip, output);
  } catch (error) {
    logger.error('DB backup pipeline failed', { error: error.message });
    return;
  }

  const exitCode = await new Promise(resolve => dump.on('close', resolve));
  if (exitCode !== 0) {
    logger.error('mysqldump exited with non-zero code', { exitCode });
    return;
  }

  logger.info('DB backup completed', { outFile });

  if (isDropboxEnabled()) {
    try {
      const uploaded = await uploadBackupToDropbox(outFile);
      logger.info('DB backup uploaded to Dropbox', { path: uploaded.path_display });
    } catch (error) {
      logger.error('DB backup Dropbox upload failed', { error: error.message });
    }
  }

  cleanupOldBackups(backupDir);
}

function startDbBackupCron() {
  if (String(process.env.DB_BACKUP_ENABLED || 'true').toLowerCase() === 'false') {
    logger.info('DB backup cron disabled');
    return;
  }

  const schedule = process.env.DB_BACKUP_CRON || defaultCron;
  const timezone = process.env.DB_BACKUP_TIMEZONE;
  const options = timezone ? { timezone } : undefined;
  cron.schedule(schedule, () => {
    runBackupOnce().catch(error => {
      logger.error('DB backup cron error', { error: error.message });
    });
  }, options);
  logger.info('DB backup cron scheduled', { schedule, timezone: timezone || 'server-local' });
}

module.exports = {
  startDbBackupCron,
  runBackupOnce
};
