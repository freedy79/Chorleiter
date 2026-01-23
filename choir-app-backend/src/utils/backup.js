const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const dbConfig = require('../config/db.config');
const logger = require('../config/logger');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function backupDatabase() {
  // Skip backup in test environment or when using in-memory DB
  if (process.env.NODE_ENV === 'test' || dbConfig.DB === ':memory:') {
    return;
  }

  const backupsDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const filePath = path.join(backupsDir, `backup-${timestamp()}.sql`);

  const dialect = (dbConfig.dialect || '').toLowerCase();
  let cmd;
  if (dialect === 'postgres' || dialect === 'postgresql') {
    cmd = `PGPASSWORD='${dbConfig.PASSWORD}' pg_dump -h ${dbConfig.HOST} -U ${dbConfig.USER} ${dbConfig.DB} > "${filePath}"`;
  } else if (dialect === 'mysql' || dialect === 'mariadb') {
    cmd = `mysqldump -h ${dbConfig.HOST} -u ${dbConfig.USER} -p'${dbConfig.PASSWORD}' ${dbConfig.DB} > "${filePath}"`;
  } else if (dialect === 'sqlite' || dialect === 'sqlite3') {
    cmd = `sqlite3 ${dbConfig.DB} .dump > "${filePath}"`;
  } else {
    // Unsupported dialect
    return;
  }

  logger.info('Starting database backup...');
  await new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
  logger.info(`Backup written to ${filePath}`);
}

module.exports = { backupDatabase };
