const db = require('../models');
const logger = require('../config/logger');
const asyncHandler = require('express-async-handler');

/**
 * Get all PWA configuration settings
 * GET /api/admin/pwa-config
 */
exports.getAllConfigs = asyncHandler(async (req, res) => {
  const configs = await db.pwa_config.findAll({
    order: [['category', 'ASC'], ['key', 'ASC']]
  });

  // Mask secret values in the response
  const masked = configs.map(config => ({
    ...config.toJSON(),
    value: config.isSecret && config.value ? '***HIDDEN***' : config.value
  }));

  res.status(200).json(masked);
});

/**
 * Get a single PWA configuration by key
 * GET /api/admin/pwa-config/:key
 */
exports.getConfigByKey = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const config = await db.pwa_config.findOne({ where: { key } });

  if (!config) {
    return res.status(404).json({ message: `Configuration key "${key}" not found.` });
  }

  const response = config.toJSON();
  if (config.isSecret && config.value) {
    response.value = '***HIDDEN***';
  }

  res.status(200).json(response);
});

/**
 * Get configs by category
 * GET /api/admin/pwa-config/category/:category
 */
exports.getConfigsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const configs = await db.pwa_config.findAll({
    where: { category },
    order: [['key', 'ASC']]
  });

  const masked = configs.map(config => ({
    ...config.toJSON(),
    value: config.isSecret && config.value ? '***HIDDEN***' : config.value
  }));

  res.status(200).json(masked);
});

/**
 * Create a new PWA configuration
 * POST /api/admin/pwa-config
 */
exports.createConfig = asyncHandler(async (req, res) => {
  const { key, value, type, category, description, isEditable, isSecret } = req.body;

  if (!key || !category) {
    return res.status(400).json({ message: 'Key and category are required.' });
  }

  const existing = await db.pwa_config.findOne({ where: { key } });
  if (existing) {
    return res.status(409).json({ message: `Configuration key "${key}" already exists.` });
  }

  const config = await db.pwa_config.create({
    key,
    value,
    type: type || 'string',
    category,
    description,
    isEditable: isEditable !== undefined ? isEditable : true,
    isSecret: isSecret || false
  });

  logger.info(`PWA config created: ${key}`, { userId: req.userId });

  const response = config.toJSON();
  if (config.isSecret && config.value) {
    response.value = '***HIDDEN***';
  }

  res.status(201).json(response);
});

/**
 * Update a PWA configuration
 * PUT /api/admin/pwa-config/:key
 */
exports.updateConfig = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value, type, category, description, isEditable, isSecret } = req.body;

  const config = await db.pwa_config.findOne({ where: { key } });

  if (!config) {
    return res.status(404).json({ message: `Configuration key "${key}" not found.` });
  }

  if (!config.isEditable) {
    return res.status(403).json({ message: `Configuration key "${key}" is not editable.` });
  }

  const updates = {};
  if (value !== undefined) updates.value = value;
  if (type !== undefined) updates.type = type;
  if (category !== undefined) updates.category = category;
  if (description !== undefined) updates.description = description;
  if (isEditable !== undefined) updates.isEditable = isEditable;
  if (isSecret !== undefined) updates.isSecret = isSecret;

  await config.update(updates);

  logger.info(`PWA config updated: ${key}`, { userId: req.userId });

  const response = config.toJSON();
  if (config.isSecret && config.value) {
    response.value = '***HIDDEN***';
  }

  res.status(200).json(response);
});

/**
 * Delete a PWA configuration
 * DELETE /api/admin/pwa-config/:key
 */
exports.deleteConfig = asyncHandler(async (req, res) => {
  const { key } = req.params;

  const config = await db.pwa_config.findOne({ where: { key } });

  if (!config) {
    return res.status(404).json({ message: `Configuration key "${key}" not found.` });
  }

  if (!config.isEditable) {
    return res.status(403).json({ message: `Configuration key "${key}" cannot be deleted.` });
  }

  await config.destroy();

  logger.info(`PWA config deleted: ${key}`, { userId: req.userId });

  res.status(204).send();
});

/**
 * Initialize default PWA configurations
 * POST /api/admin/pwa-config/initialize
 */
exports.initializeDefaults = asyncHandler(async (req, res) => {
  const defaults = [
    {
      key: 'vapid_public_key',
      value: process.env.VAPID_PUBLIC_KEY || '',
      type: 'string',
      category: 'vapid',
      description: 'VAPID public key for push notifications',
      isEditable: true,
      isSecret: false
    },
    {
      key: 'vapid_private_key',
      value: process.env.VAPID_PRIVATE_KEY || '',
      type: 'string',
      category: 'vapid',
      description: 'VAPID private key for push notifications (kept secret)',
      isEditable: true,
      isSecret: true
    },
    {
      key: 'vapid_subject',
      value: process.env.VAPID_SUBJECT || '',
      type: 'string',
      category: 'vapid',
      description: 'VAPID subject (typically a mailto: or https: URL)',
      isEditable: true,
      isSecret: false
    },
    {
      key: 'push_notifications_enabled',
      value: 'true',
      type: 'boolean',
      category: 'features',
      description: 'Enable/disable push notifications globally',
      isEditable: true,
      isSecret: false
    },
    {
      key: 'sw_update_check_interval',
      value: '3600000',
      type: 'number',
      category: 'service_worker',
      description: 'Service worker update check interval in milliseconds (default: 1 hour)',
      isEditable: true,
      isSecret: false
    },
    {
      key: 'cache_max_age_hours',
      value: '24',
      type: 'number',
      category: 'cache',
      description: 'Maximum cache age in hours',
      isEditable: true,
      isSecret: false
    },
    {
      key: 'offline_mode_enabled',
      value: 'true',
      type: 'boolean',
      category: 'features',
      description: 'Enable offline mode with service worker caching',
      isEditable: true,
      isSecret: false
    },
    {
      key: 'install_prompt_enabled',
      value: 'true',
      type: 'boolean',
      category: 'features',
      description: 'Show PWA install prompt to users',
      isEditable: true,
      isSecret: false
    },
    {
      key: 'background_sync_enabled',
      value: 'false',
      type: 'boolean',
      category: 'features',
      description: 'Enable background sync for offline actions',
      isEditable: true,
      isSecret: false
    }
  ];

  let created = 0;
  let skipped = 0;

  for (const config of defaults) {
    const existing = await db.pwa_config.findOne({ where: { key: config.key } });
    if (!existing) {
      await db.pwa_config.create(config);
      created++;
    } else {
      skipped++;
    }
  }

  logger.info(`PWA config defaults initialized: ${created} created, ${skipped} skipped`, { userId: req.userId });

  res.status(200).json({
    message: 'Default configurations initialized',
    created,
    skipped,
    total: defaults.length
  });
});
