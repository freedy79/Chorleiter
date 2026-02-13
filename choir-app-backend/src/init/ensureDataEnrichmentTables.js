/**
 * Migration: Add Data Enrichment Tables
 * Creates three new tables for the Data Enrichment Agent feature:
 * - data_enrichment_jobs: Track enrichment job execution
 * - data_enrichment_suggestions: Store AI-generated suggestions
 * - data_enrichment_settings: Store encrypted API keys and configuration
 */

const logger = require('../config/logger');
const db = require('../models');

async function ensureDataEnrichmentTables() {
    try {
        logger.info('[Migration] Ensuring Data Enrichment tables...');

        // First, drop and recreate without using Sequelize to avoid constraint issues
        await fixDataEnrichmentConstraints();

        logger.info('[Migration] Data Enrichment tables created/updated successfully');

        // Initialize default settings if they don't exist
        await initializeDefaultSettings();

    } catch (error) {
        logger.error('[Migration] Error creating Data Enrichment tables:', error);
        throw error;
    }
}

async function fixDataEnrichmentConstraints() {
    const sequelize = db.sequelize;

    try {
        logger.info('[Migration] Fixing data enrichment table constraints...');

        // Drop the enrichment tables if they exist (created with wrong constraints by initial sync)
        // Do this completely to ensure clean recreation
        try {
            await sequelize.query('DROP TABLE IF EXISTS "data_enrichment_suggestion" CASCADE', { raw: true });
            logger.info('[Migration] Dropped table: data_enrichment_suggestion');
        } catch (err) {
            logger.debug('[Migration] Table data_enrichment_suggestion may not exist:', err.message);
        }

        try {
            await sequelize.query('DROP TABLE IF EXISTS "data_enrichment_jobs" CASCADE', { raw: true });
            logger.info('[Migration] Dropped table: data_enrichment_jobs');
        } catch (err) {
            logger.debug('[Migration] Table data_enrichment_jobs may not exist:', err.message);
        }

        try {
            await sequelize.query('DROP TABLE IF EXISTS "data_enrichment_setting" CASCADE', { raw: true });
            logger.info('[Migration] Dropped table: data_enrichment_setting');
        } catch (err) {
            logger.debug('[Migration] Table data_enrichment_setting may not exist:', err.message);
        }

        // Drop associated enums if they exist
        try {
            await sequelize.query('DROP TYPE IF EXISTS "enum_data_enrichment_jobs_jobType" CASCADE', { raw: true });
            await sequelize.query('DROP TYPE IF EXISTS "enum_data_enrichment_jobs_status" CASCADE', { raw: true });
            logger.info('[Migration] Dropped enrichment enums');
        } catch (err) {
            logger.debug('[Migration] Enums may not exist:', err.message);
        }

        // Now recreate all enrichment tables with force: true to ensure fresh creation
        // FK constraints are defined in the models and will be created with the tables
        logger.info('[Migration] Recreating enrichment tables...');

        await db.data_enrichment_job.sync({ force: true });
        logger.info('[Migration] Table data_enrichment_jobs created successfully');

        await db.data_enrichment_suggestion.sync({ force: true });
        logger.info('[Migration] Table data_enrichment_suggestion created successfully');

        await db.data_enrichment_setting.sync({ force: true });
        logger.info('[Migration] Table data_enrichment_setting created successfully');

        logger.info('[Migration] All enrichment table constraints fixed');

    } catch (error) {
        logger.error('[Migration] Error in fixDataEnrichmentConstraints:', error.message);
        throw error;
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
