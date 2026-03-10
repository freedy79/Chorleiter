const logger = require('../config/logger');
const db = require('../models');

/**
 * Migration: Ensure pwa_config table exists with correct schema.
 *
 * Only creates the table if it doesn't already exist.
 * Existing data (admin-edited VAPID keys, feature toggles) is preserved across restarts.
 * Default settings are seeded via findOrCreate so they never overwrite existing values.
 */
async function ensurePwaConfig() {
    try {
        logger.info('[Migration] Ensuring pwa_config table...');

        const queryInterface = db.sequelize.getQueryInterface();
        const existingTables = await queryInterface.showAllTables();
        const tableSet = new Set(existingTables.map(t => t.toLowerCase()));

        if (!tableSet.has('pwa_configs') && !tableSet.has('pwa_config')) {
            // Table doesn't exist yet — create it fresh
            await db.pwa_config.sync();
            logger.info('[Migration] pwa_config table created successfully');
        } else {
            logger.info('[Migration] pwa_config table already exists - skipping');
        }

        // Initialize default PWA settings (findOrCreate — safe for existing data)
        await initializeDefaultPwaSettings();

    } catch (error) {
        logger.error('[Migration] Error ensuring pwa_config:', error);
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
