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
        logger.info('[Migration] Creating Data Enrichment tables...');
        
        // Sync the new models to database
        await db.data_enrichment_job.sync({ alter: true });
        await db.data_enrichment_suggestion.sync({ alter: true });
        await db.data_enrichment_setting.sync({ alter: true });
        
        logger.info('[Migration] Data Enrichment tables created/updated successfully');
        
        // Initialize default settings if they don't exist
        await initializeDefaultSettings();
        
    } catch (error) {
        logger.error('[Migration] Error creating Data Enrichment tables:', error);
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
