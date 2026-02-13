const db = require('../models');
const logger = require('../config/logger');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const MAX_SUBSCRIPTIONS_PER_USER = Number(process.env.PUSH_MAX_SUBSCRIPTIONS_PER_USER) || 10;

async function ensureChoirMembership(userId, choirId) {
  if (!userId || !choirId) return false;
  const membership = await db.user_choir.findOne({ where: { userId, choirId } });
  return !!membership;
}

exports.getVapidPublicKey = async (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(500).send({ message: 'VAPID public key not configured.' });
  }
  return res.status(200).send({ publicKey: VAPID_PUBLIC_KEY });
};

exports.subscribe = async (req, res) => {
  const { endpoint, keys, choirId } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth || !choirId) {
    return res.status(400).send({ message: 'endpoint, keys, and choirId are required.' });
  }

  const isMember = await ensureChoirMembership(req.userId, choirId);
  if (!isMember) {
    return res.status(403).send({ message: 'Not allowed to subscribe for this choir.' });
  }

  const existing = await db.push_subscription.findOne({
    where: { userId: req.userId, choirId, endpoint }
  });

  if (!existing) {
    const count = await db.push_subscription.count({ where: { userId: req.userId } });
    if (count >= MAX_SUBSCRIPTIONS_PER_USER) {
      return res.status(429).send({ message: 'Too many push subscriptions for this user.' });
    }
  }

  const payload = {
    userId: req.userId,
    choirId,
    endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth
    }
  };

  try {
    if (existing) {
      await existing.update(payload);
      return res.status(200).send({ message: 'Subscription updated.' });
    }
    await db.push_subscription.create(payload);
    return res.status(201).send({ message: 'Subscription created.' });
  } catch (err) {
    logger.error(`Failed to store push subscription: ${err.message}`);
    return res.status(500).send({ message: 'Failed to store subscription.' });
  }
};

exports.unsubscribe = async (req, res) => {
  const { endpoint, choirId } = req.body || {};
  if (!endpoint || !choirId) {
    return res.status(400).send({ message: 'endpoint and choirId are required.' });
  }

  const isMember = await ensureChoirMembership(req.userId, choirId);
  if (!isMember) {
    return res.status(403).send({ message: 'Not allowed to unsubscribe for this choir.' });
  }

  try {
    await db.push_subscription.destroy({
      where: { userId: req.userId, choirId, endpoint }
    });
    return res.status(204).send();
  } catch (err) {
    logger.error(`Failed to remove push subscription: ${err.message}`);
    return res.status(500).send({ message: 'Failed to remove subscription.' });
  }
};
