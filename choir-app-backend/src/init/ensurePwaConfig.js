const logger = require('../config/logger');
const db = require('../models');

/**
 * Migration: Fix pwa_config table
 * The table was created with sync({ alter: true }) which generates invalid SQL on PostgreSQL
 * for ENUM changes and constraint modifications.
 *
 * Solution: Drop and recreate table with correct schema
 */
async function ensurePwaConfig() {
    try {
        logger.info('[Migration] Ensuring pwa_config table...');

        // Drop existing table and ENUM if they exist
        try {
            await db.sequelize.query('DROP TABLE IF EXISTS "pwa_config" CASCADE', { raw: true });
            await db.sequelize.query('DROP TYPE IF EXISTS "enum_pwa_config_type" CASCADE', { raw: true });
            logger.info('[Migration] Dropped old pwa_config table and enum');
        } catch (err) {
            logger.debug('[Migration] pwa_config may not exist:', err.message);
        }

        // Recreate with Sequelize model (force: true ensures clean creation)
        await db.pwa_config.sync({ force: true });
        logger.info('[Migration] pwa_config table created successfully');

        // Initialize default PWA settings
        await initializeDefaultPwaSettings();

    } catch (error) {
        logger.error('[Migration] Error creating pwa_config:', error);
        throw error;
    }
}

async function initializeDefaultPwaSettings() {
    try {
        const defaultSettings = [
            {
                key: 'vapid_public_key',
                value: process.env.VAPID_PUBLIC_KEY || '',
                type: 'string',
                category: 'vapid',
                description: 'VAPID public key for web push notifications',
                isEditable: false,
                isSecret: false
            },
            {
                key: 'vapid_private_key',
                value: process.env.VAPID_PRIVATE_KEY || '',
                type: 'string',
                category: 'vapid',
                description: 'VAPID private key (server-side only)',
                isEditable: false,
                isSecret: true
            },
            {
                key: 'push_enabled',
                value: 'true',
                type: 'boolean',
                category: 'notification',
                description: 'Enable push notifications globally',
                isEditable: true,
                isSecret: false
            },
            {
                key: 'sw_update_interval',
                value: '3600000',
                type: 'number',
                category: 'service_worker',
                description: 'Service worker update check interval in ms',
                isEditable: true,
                isSecret: false
            },
            {
                key: 'cache_version',
                value: '1',
                type: 'string',
                category: 'cache',
                description: 'Cache version for service worker',
                isEditable: false,
                isSecret: false
            }
        ];

        for (const setting of defaultSettings) {
            const [, created] = await db.pwa_config.findOrCreate({
                where: { key: setting.key },
                defaults: setting
            });

            if (created) {
                logger.info(`[Migration] Created default PWA setting: ${setting.key}`);
            }
        }

    } catch (error) {
        logger.error('[Migration] Error initializing default PWA settings:', error);
        throw error;
    }
}

module.exports = {
    ensurePwaConfig,
    initializeDefaultPwaSettings
};
