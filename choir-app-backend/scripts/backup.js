require('dotenv').config();
const { backupDatabase } = require('../src/utils/backup');

backupDatabase()
  .then(() => {
    console.log('Database backup completed');
  })
  .catch(err => {
    console.error('Database backup failed:', err);
    process.exit(1);
  });
