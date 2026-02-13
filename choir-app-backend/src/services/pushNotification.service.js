const db = require('../models');
const logger = require('../config/logger');
const { Op } = require('sequelize');

let webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

function configureWebPush() {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } else {
    logger.warn('Push notifications not configured: VAPID keys missing.');
  }
}

configureWebPush();

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

function setWebPushForTest(mockWebPush) {
  if (mockWebPush) {
    webpush = mockWebPush;
    configureWebPush();
  }
}

module.exports = {
  sendNotification,
  sendToChoirMembers,
  removeInvalidSubscription,
  setWebPushForTest
};
