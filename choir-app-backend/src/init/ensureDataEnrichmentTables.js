/**
 * Migration: Add Data Enrichment Tables
 * Creates three new tables for the Data Enrichment Agent feature:
 * - data_enrichment_jobs: Track enrichment job execution
 * - data_enrichment_suggestions: Store AI-generated suggestions
 * - data_enrichment_settings: Store encrypted API keys and configuration
 *
 * IMPORTANT: Tables are only created if they don't exist yet.
 * Existing data (especially API keys in settings) is preserved across restarts.
 */

const logger = require('../config/logger');
const db = require('../models');

async function ensureDataEnrichmentTables() {
    try {
        logger.info('[Migration] Ensuring Data Enrichment tables...');

        await createTablesIfNotExist();
        await migrateEntityIdToString();

        logger.info('[Migration] Data Enrichment tables ensured successfully');

        // Initialize default settings if they don't exist (uses findOrCreate, safe for existing data)
        await initializeDefaultSettings();

    } catch (error) {
        logger.error('[Migration] Error creating Data Enrichment tables:', error);
        throw error;
    }
}

/**
 * Check if each enrichment table exists and create only missing ones.
 * Never drops existing tables - this preserves API keys and other user data.
 */
async function createTablesIfNotExist() {
    const sequelize = db.sequelize;

    try {
        logger.info('[Migration] Checking data enrichment tables...');

        const queryInterface = sequelize.getQueryInterface();
        const existingTables = await queryInterface.showAllTables();

        // Normalize table names for comparison (PostgreSQL returns lowercase)
        const tableSet = new Set(existingTables.map(t => t.toLowerCase()));

        // Create tables in dependency order: jobs first, then suggestions (FK to jobs), then settings
        if (!tableSet.has('data_enrichment_jobs')) {
            await db.data_enrichment_job.sync();
            logger.info('[Migration] Created table: data_enrichment_jobs');
        } else {
            logger.info('[Migration] Table data_enrichment_jobs already exists - skipping');
        }

        if (!tableSet.has('data_enrichment_suggestions') && !tableSet.has('data_enrichment_suggestion')) {
            await db.data_enrichment_suggestion.sync();
            logger.info('[Migration] Created table: data_enrichment_suggestions');
        } else {
            logger.info('[Migration] Table data_enrichment_suggestions already exists - skipping');
        }

        if (!tableSet.has('data_enrichment_settings') && !tableSet.has('data_enrichment_setting')) {
            await db.data_enrichment_setting.sync();
            logger.info('[Migration] Created table: data_enrichment_settings');
        } else {
            logger.info('[Migration] Table data_enrichment_settings already exists - skipping');
        }

        logger.info('[Migration] All enrichment tables ensured');

    } catch (error) {
        logger.error('[Migration] Error in createTablesIfNotExist:', error.message);
        throw error;
    }
}

/**
 * Migration: Change entityId column from UUID to VARCHAR(255)
 * Pieces, composers, and publishers use integer IDs, not UUIDs.
 * This must run after createTablesIfNotExist() to ensure the table exists.
 */
async function migrateEntityIdToString() {
    const sequelize = db.sequelize;
    const queryInterface = sequelize.getQueryInterface();

    // Detect the actual table name (Sequelize may pluralize)
    const existingTables = await queryInterface.showAllTables();
    const tableSet = new Set(existingTables.map(t => t.toLowerCase()));
    const tableName = tableSet.has('data_enrichment_suggestions')
        ? 'data_enrichment_suggestions'
        : tableSet.has('data_enrichment_suggestion')
            ? 'data_enrichment_suggestion'
            : null;

    if (!tableName) {
        logger.warn('[Migration] data_enrichment_suggestions table not found, skipping entityId migration');
        return;
    }

    try {
        const tableDesc = await queryInterface.describeTable(tableName);
        const entityIdCol = tableDesc['entityId'] || tableDesc['entityid'];

        if (!entityIdCol) {
            logger.warn('[Migration] entityId column not found in suggestions table');
            return;
        }

        const colType = (entityIdCol.type || '').toUpperCase();

        // Only migrate if currently UUID type
        if (colType === 'UUID' || colType.includes('UUID')) {
            logger.info('[Migration] Migrating entityId column from UUID to VARCHAR(255)...');

            await sequelize.query(
                `ALTER TABLE "${tableName}" ALTER COLUMN "entityId" TYPE VARCHAR(255) USING "entityId"::text`
            );

            logger.info('[Migration] entityId column migrated to VARCHAR(255) successfully');
        } else {
            logger.info(`[Migration] entityId column is already ${colType}, no migration needed`);
        }
    } catch (error) {
        logger.error('[Migration] Error migrating entityId column:', error.message);
        // Non-fatal: log but don't block startup if migration fails
    }
}

async function initializeDefaultSettings() {
    try {
        const defaultSettings = [
            {
                settingKey: 'llm_primary_provider',
                settingValue: 'gemini',
                dataType: 'string',
                description: 'Primary LLM provider for enrichment (gemini, claude, openai)'
            },
            {
                settingKey: 'llm_fallback_provider',
                settingValue: 'claude',
                dataType: 'string',
                description: 'Fallback LLM provider if primary fails'
            },
            {
                settingKey: 'enrichment_batch_size',
                settingValue: '10',
                dataType: 'number',
                description: 'Number of items to process per LLM request'
            },
            {
                settingKey: 'enrichment_confidence_threshold',
                settingValue: '0.75',
                dataType: 'number',
                description: 'Minimum confidence score to show suggestions (0-1)'
            },
            {
                settingKey: 'enrichment_auto_approve_enabled',
                settingValue: 'false',
                dataType: 'boolean',
                description: 'Whether to auto-apply high-confidence suggestions'
            },
            {
                settingKey: 'enrichment_auto_approve_threshold',
                settingValue: '0.95',
                dataType: 'number',
                description: 'Minimum confidence for auto-approval (0-1)'
            },
            {
                settingKey: 'enrichment_monthly_budget',
                settingValue: '50',
                dataType: 'number',
                description: 'Monthly budget in USD for LLM API costs'
            },
            {
                settingKey: 'enrichment_enabled',
                settingValue: 'true',
                dataType: 'boolean',
                description: 'Whether data enrichment feature is enabled'
            },
            {
                settingKey: 'enrichment_schedule_cron',
                settingValue: '0 2 * * *',
                dataType: 'string',
                description: 'Cron schedule for automatic enrichment jobs (2 AM daily)'
            }
        ];

        for (const setting of defaultSettings) {
            const [record, created] = await db.data_enrichment_setting.findOrCreate({
                where: { settingKey: setting.settingKey },
                defaults: setting
            });

            if (created) {
                logger.info(`[Migration] Created default setting: ${setting.settingKey}`);
            }
        }

    } catch (error) {
        logger.error('[Migration] Error initializing default settings:', error);
        throw error;
    }
}

module.exports = {
    ensureDataEnrichmentTables,
    initializeDefaultSettings
};
