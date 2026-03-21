const db = require('../models');
const logger = require('../config/logger');
const { Op } = require('sequelize');

let webpush = require('web-push');

let vapidConfigured = false;

function configureWebPushFromValues(publicKey, privateKey, subject) {
  if (publicKey && privateKey && subject) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
}

// Try synchronous init from env vars
configureWebPushFromValues(
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
  process.env.VAPID_SUBJECT
);
if (!vapidConfigured) {
  logger.warn('Push notifications not configured from env vars, will try DB on first use.');
}

async function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  const rows = await db.pwa_config.findAll({
    where: { key: ['vapid_public_key', 'vapid_private_key', 'vapid_subject'] }
  });
  const map = {};
  for (const row of rows) { map[row.key] = row.value; }
  configureWebPushFromValues(map.vapid_public_key, map.vapid_private_key, map.vapid_subject);
  if (!vapidConfigured) {
    logger.warn('Push notifications not configured: VAPID keys missing in env and DB.');
  }
  return vapidConfigured;
}

function isInvalidSubscriptionError(err) {
  const status = err?.statusCode || err?.status || err?.statusCode;
  return status === 404 || status === 410;
}

function normalizePayload(payload) {
  if (!payload) return {};
  if (payload.notification) return payload;

  const { title, body, icon, data, url, ...rest } = payload;
  const notification = {
    ...(title ? { title } : {}),
    ...(body ? { body } : {}),
    ...(icon ? { icon } : {}),
    ...(data ? { data } : {})
  };

  if (url) {
    notification.data = { ...(notification.data || {}), url };
  }

  if (Object.keys(notification).length === 0) {
    return payload;
  }

  return { notification, ...rest };
}

async function removeInvalidSubscription(subscriptionId) {
  if (!subscriptionId) return;
  await db.push_subscription.destroy({ where: { id: subscriptionId } });
}

async function sendNotification(subscription, payload) {
  if (!subscription || !subscription.endpoint) return;
  const configured = await ensureVapidConfigured();
  if (!configured) {
    logger.error('Cannot send push notification: VAPID keys not configured.');
    return;
  }
  const keys = subscription.keys || {};
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth
    }
  };
  const body = JSON.stringify(normalizePayload(payload));

  try {
    await webpush.sendNotification(pushSubscription, body);
  } catch (err) {
    if (isInvalidSubscriptionError(err)) {
      logger.info(`Removing invalid push subscription ${subscription.id} due to ${err.statusCode || err.status}`);
      await removeInvalidSubscription(subscription.id);
      return;
    }
    logger.error(`Error sending push notification: ${err.message}`);
    throw err;
  }
}

async function sendToChoirMembers(choirId, payload, excludeUserId) {
  if (!choirId) return;
  const where = { choirId };
  if (excludeUserId) {
    where.userId = { [Op.ne]: excludeUserId };
  }
  const subscriptions = await db.push_subscription.findAll({ where });
  if (!subscriptions || subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map(subscription => sendNotification(subscription, payload))
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const sub = subscriptions[index];
      logger.warn(`Push notification failed for subscription ${sub?.id}: ${result.reason?.message || result.reason}`);
    }
  });
}

async function sendToUsersInChoir(choirId, userIds, payload, excludeUserId) {
  if (!choirId || !Array.isArray(userIds) || userIds.length === 0) return;

  const uniqueUserIds = Array.from(new Set(userIds.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0)));
  if (!uniqueUserIds.length) return;

  const where = {
    choirId,
    userId: { [Op.in]: uniqueUserIds }
  };

  if (excludeUserId) {
    where.userId = { [Op.in]: uniqueUserIds.filter(id => id !== excludeUserId) };
  }

  const subscriptions = await db.push_subscription.findAll({ where });
  if (!subscriptions || subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map(subscription => sendNotification(subscription, payload))
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const sub = subscriptions[index];
      logger.warn(`Push notification failed for subscription ${sub?.id}: ${result.reason?.message || result.reason}`);
    }
  });
}

function setWebPushForTest(mockWebPush) {
  if (mockWebPush) {
    webpush = mockWebPush;
    vapidConfigured = false;
    configureWebPushFromValues(
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
      process.env.VAPID_SUBJECT
    );
  }
}

module.exports = {
  sendNotification,
  sendToChoirMembers,
  sendToUsersInChoir,
  removeInvalidSubscription,
  setWebPushForTest
};
