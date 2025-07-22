const db = require('../models');

async function getFrontendUrl() {
  const setting = await db.system_setting.findByPk('FRONTEND_URL');
  return setting?.value || process.env.FRONTEND_URL || 'https://nak-chorleiter.de';
}

module.exports = { getFrontendUrl };
