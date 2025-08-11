const db = require('../models');

async function getFrontendUrl() {
  const setting = await db.system_setting.findByPk('FRONTEND_URL');
  const raw = setting?.value || process.env.FRONTEND_URL || 'https://nak-chorleiter.de';
  return raw
    .replace(/#.*$/, '') // remove hash fragments like '/#/'
    .replace(/\/$/, ''); // remove trailing slash
}

module.exports = { getFrontendUrl };
