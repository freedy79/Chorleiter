const { Op } = require('sequelize');
const db = require('../models');
const logger = require('../config/logger');
const { sendTemplateMail } = require('./email.service');
const { getFrontendUrl } = require('../utils/frontend-url');
const oauthService = require('./oauth.service');

const WARN_DAYS = parseInt(process.env.API_TOKEN_EXPIRY_WARN_DAYS, 10) || 7;
const CHECK_INTERVAL_MS = parseInt(process.env.API_TOKEN_EXPIRY_CHECK_INTERVAL_MS, 10) || 60 * 60 * 1000;

function formatDate(value) {
  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysLeft(expiresAt) {
  return Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / (24 * 60 * 60 * 1000)));
}

/**
 * Determines who should be warned about an expiring token.
 *
 * Preferred recipient is the creator; if they lost their management role or left
 * the choir the warning goes to the remaining choir admins and directors instead.
 */
async function resolveRecipients(token) {
  const memberships = await db.user_choir.findAll({
    where: { choirId: token.choirId },
    include: [{ model: db.user, attributes: ['id', 'email', 'firstName', 'name'] }],
  });

  const managers = memberships.filter(m => Array.isArray(m.rolesInChoir)
    && m.rolesInChoir.some(role => ['choir_admin', 'director'].includes(role)));

  const creator = managers.find(m => m.userId === token.createdByUserId);
  const targets = creator ? [creator] : managers;

  return targets
    .map(m => m.user)
    .filter(user => user && user.email);
}

async function notifyExpiringTokens() {
  try {
    const horizon = new Date(Date.now() + WARN_DAYS * 24 * 60 * 60 * 1000);
    const tokens = await db.choir_api_token.findAll({
      where: {
        revokedAt: null,
        expiryNotifiedAt: null,
        expiresAt: { [Op.gt]: new Date(), [Op.lte]: horizon },
      },
      include: [{ model: db.choir, as: 'choir', attributes: ['id', 'name'] }],
    });

    if (!tokens.length) return 0;

    const frontendUrl = await getFrontendUrl();
    let sent = 0;

    for (const token of tokens) {
      const recipients = await resolveRecipients(token);
      if (!recipients.length) {
        logger.warn(`[ApiToken] No recipient found for expiring token ${token.id} (choir ${token.choirId})`);
        // Mark it anyway so the same token is not retried every hour.
        await token.update({ expiryNotifiedAt: new Date() });
        continue;
      }

      for (const user of recipients) {
        await sendTemplateMail('api-token-expiry', user.email, {
          first_name: user.firstName,
          surname: user.name,
          choir: token.choir?.name || '',
          label: token.label,
          token_prefix: token.tokenPrefix,
          expires_at: formatDate(token.expiresAt),
          days_left: daysLeft(token.expiresAt),
          link: `${frontendUrl}/choir-management/api-tokens`,
        });
        sent += 1;
      }

      await token.update({ expiryNotifiedAt: new Date() });
      logger.info(`[ApiToken] Expiry warning sent for token ${token.id} (choir ${token.choirId})`);
    }

    return sent;
  } catch (err) {
    logger.error(`[ApiToken] Expiry notification run failed: ${err.message}`);
    return 0;
  }
}

let interval = null;

async function runMaintenance() {
  await notifyExpiringTokens();
  try {
    const pruned = await oauthService.pruneExpired();
    if (pruned.codes || pruned.refresh) {
      logger.debug(`[OAuth] Pruned ${pruned.codes} codes and ${pruned.refresh} refresh tokens`);
    }
  } catch (err) {
    logger.warn(`[OAuth] Pruning expired records failed: ${err.message}`);
  }
}

function startScheduler() {
  if (interval) return;
  logger.info(`API token expiry notifier started (warn ${WARN_DAYS} days ahead, interval ${CHECK_INTERVAL_MS / 60000}min)`);
  runMaintenance();
  interval = setInterval(runMaintenance, CHECK_INTERVAL_MS);
}

function stopScheduler() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

module.exports = {
  WARN_DAYS,
  notifyExpiringTokens,
  startScheduler,
  stopScheduler,
};
