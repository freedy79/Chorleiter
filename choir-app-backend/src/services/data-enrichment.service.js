/**
 * Data Enrichment Service
 * Orchestrates enrichment jobs and coordinates with LLM providers
 * Manages job execution, tracking, and suggestion storage
 */

const logger = require('../config/logger');
const db = require('../models');
const { LLMRouter, dataEnrichmentSettingsService } = require('./llm');

class DataEnrichmentService {
    constructor() {
        this.router = null;
        this.initialized = false;
    }

    /**
     * Initialize service
     */
    async initialize() {
        if (this.initialized) return;

        try {
            this.router = new LLMRouter(dataEnrichmentSettingsService);
            await this.router.initialize();
            this.initialized = true;
            logger.info('[DataEnrichmentService] Initialized');
        } catch (error) {
            logger.error('[DataEnrichmentService] Initialization error:', error);
            throw error;
        }
    }

    /**
     * Create and execute enrichment job
     * @param {string} jobType - 'piece', 'composer', or 'publisher'
     * @param {Array} enrichmentFields - Fields to enrich
     * @param {Object} options - Additional options (filters, autoApprove, etc.)
     * @param {string} userId - User creating the job
     * @returns {Promise<Object>}
     */
    async createEnrichmentJob(jobType, enrichmentFields, options = {}, userId) {
        if (!this.initialized) await this.initialize();

        try {
            // Validate job type
            if (!['piece', 'composer', 'publisher'].includes(jobType)) {
                throw new Error(`Invalid job type: ${jobType}`);
            }

            // Load API keys from DB into providers before checking availability
            await this.loadApiKeysIntoProviders();

            // Pre-validate: check provider availability before creating job
            const availableProviders = this.getAvailableProviders().filter(p => p.available);
            if (availableProviders.length === 0) {
                throw new Error('Kein LLM-Provider verfügbar. Bitte hinterlegen Sie zunächst einen gültigen API-Key in den Einstellungen.');
            }

            // Create job record
            const job = await db.data_enrichment_job.create({
                jobType,
                status: 'pending',
                totalItems: 0,
                createdBy: userId,
                metadata: {
                    enrichmentFields,
                    options,
                    timestamp: new Date().toISOString()
                }
            });

            logger.info(`[DataEnrichmentService] Job created: ${job.id}`, {
                jobType,
                fields: enrichmentFields
            });

            // Start async job execution (pass userId)
            this.executeJob(job.id, jobType, enrichmentFields, options, userId)
                .catch(error => {
                    logger.error('[DataEnrichmentService] Job execution error:', {
                        jobId: job.id,
                        error: error.message,
                        stack: error.stack
                    });
                });

            return {
                jobId: job.id,
                status: 'pending',
                message: 'Job queued for processing'
            };
        } catch (error) {
            logger.error('[DataEnrichmentService] Error creating job:', error);
            throw error;
        }
    }

    /**
     * Execute enrichment job (async)
     */
    async executeJob(jobId, jobType, enrichmentFields, options = {}, userId = null) {
        const startTime = Date.now();

        try {
            // Get job record
            const job = await db.data_enrichment_job.findByPk(jobId);
            if (!job) {
                throw new Error(`Job ${jobId} not found`);
            }

            // Update job status to running
            await job.update({
                status: 'running',
                startedAt: new Date()
            });

            // Ensure API keys are loaded from DB into providers
            await this.loadApiKeysIntoProviders();

            // Re-read provider settings from DB (user may have changed them since service init)
            await this.router.initialize();

            // Record which provider will be used so the UI can show it immediately
            await job.update({
                metadata: {
                    ...job.metadata,
                    activeProvider: this.router.primaryProviderName,
                    strategy: this.router.strategy
                }
            });

            // Get items to enrich
            const items = await this.getItemsToEnrich(jobType, options);

            if (items.length === 0) {
                await job.update({
                    status: 'completed',
                    completedAt: new Date(),
                    totalItems: 0,
                    successCount: 0,
                    errorCount: 0,
                    errorMessage: 'Keine Einträge zum Anreichern gefunden'
                });
                logger.info(`[DataEnrichmentService] Job ${jobId}: No items to enrich`);
                return;
            }

            await job.update({ totalItems: items.length });

            logger.info(`[DataEnrichmentService] Starting job execution`, {
                jobId,
                jobType,
                itemCount: items.length
            });

            // Progress callback: updates processedItems in DB after each batch
            let lastProgressUpdate = 0;
            const progressCallback = async ({ processed, total, batchSuggestions, totalCostSoFar }) => {
                const now = Date.now();
                // Throttle DB writes: max one write per 3 seconds
                if (now - lastProgressUpdate < 3000) return;
                lastProgressUpdate = now;
                await db.data_enrichment_job.update(
                    { processedItems: processed },
                    { where: { id: jobId } }
                ).catch(() => {}); // ignore update errors during progress
            };

            // Call LLM router
            const result = await this.router.enrichPieces(items, enrichmentFields, progressCallback);

            // Store suggestions
            const suggestionsStored = await this.storeSuggestions(
                jobId,
                jobType,
                result.suggestions,
                userId
            );

            // Save sample prompt/response to metadata for UI transparency
            await db.data_enrichment_job.update(
                {
                    metadata: {
                        ...job.metadata,
                        activeProvider: this.router.primaryProviderName,
                        strategy: this.router.strategy,
                        samplePrompt: result.samplePrompt || null,
                        sampleResponse: result.sampleResponse || null
                    }
                },
                { where: { id: jobId } }
            );

            // Apply auto-approvals if enabled
            const autoApproveThreshold = options.autoApproveThreshold || 0.95;
            if (options.autoApprove) {
                await this.autoApproveSuggestions(jobId, autoApproveThreshold);
            }

            // Update job completion
            await job.update({
                status: 'completed',
                completedAt: new Date(),
                successCount: suggestionsStored.length,
                errorCount: items.length - suggestionsStored.length,
                apiCosts: result.totalCost,
                llmProvider: result.provider
            });

            const duration = (Date.now() - startTime) / 1000;
            logger.info(`[DataEnrichmentService] Job completed`, {
                jobId,
                duration: `${duration}s`,
                suggestionsCount: suggestionsStored.length,
                totalCost: result.totalCost
            });

        } catch (error) {
            const errorDetails = {
                jobId,
                message: error.message,
                stack: error.stack,
                provider: this.router?.primaryProviderName || 'unknown'
            };
            logger.error(`[DataEnrichmentService] Job failed: ${jobId}`, errorDetails);

            // Update job to failed state with detailed error
            try {
                const job = await db.data_enrichment_job.findByPk(jobId);
                if (job) {
                    await job.update({
                        status: 'failed',
                        errorMessage: error.message,
                        completedAt: new Date(),
                        metadata: {
                            ...job.metadata,
                            errorDetails: {
                                message: error.message,
                                provider: errorDetails.provider,
                                timestamp: new Date().toISOString()
                            }
                        }
                    });
                }
            } catch (updateError) {
                logger.error('[DataEnrichmentService] Error updating job status:', updateError);
            }
        }
    }

    /**
     * Get items to enrich from database
     */
    async getItemsToEnrich(jobType, options = {}) {
        try {
            let items = [];

            switch (jobType) {
                case 'piece':
                    items = await db.piece.findAll({
                        include: [
                            { model: db.composer, as: 'composer' },
                            { model: db.category, as: 'category' }
                        ],
                        limit: options.limit || 2024,
                        where: options.where || {}
                    });
                    break;

                case 'composer':
                    items = await db.composer.findAll({
                        limit: options.limit || 1000,
                        where: options.where || {}
                    });
                    break;

                case 'publisher':
                    items = await db.publisher.findAll({
                        limit: options.limit || 500,
                        where: options.where || {}
                    });
                    break;
            }

            return items;
        } catch (error) {
            logger.error('[DataEnrichmentService] Error getting items:', error);
            throw error;
        }
    }

    /**
     * Store suggestions in database
     */
    async storeSuggestions(jobId, jobType, suggestions, userId) {
        const stored = [];

        try {
            for (const suggestion of suggestions) {
                const stored_suggestion = await db.data_enrichment_suggestion.create({
                    jobId,
                    entityType: jobType,
                    entityId: suggestion.entityId || suggestion.pieceId,
                    fieldName: suggestion.fieldName,
                    originalValue: suggestion.originalValue || null,
                    suggestedValue: suggestion.suggestedValue,
                    confidence: suggestion.confidence || 0.5,
                    source: suggestion.source || 'LLM',
                    reasoning: suggestion.reasoning || '',
                    status: 'pending'
                });
                stored.push(stored_suggestion.id);
            }

            logger.info('[DataEnrichmentService] Suggestions stored', {
                jobId,
                count: stored.length
            });

            return stored;
        } catch (error) {
            logger.error('[DataEnrichmentService] Error storing suggestions:', error);
            throw error;
        }
    }

    /**
     * Auto-approve high-confidence suggestions
     */
    async autoApproveSuggestions(jobId, confidenceThreshold = 0.95) {
        try {
            const suggestions = await db.data_enrichment_suggestion.findAll({
                where: {
                    jobId,
                    status: 'pending',
                    confidence: {
                        [db.Sequelize.Op.gte]: confidenceThreshold
                    }
                }
            });

            let approved = 0;

            for (const suggestion of suggestions) {
                await suggestion.update({
                    status: 'approved'
                });
                approved++;
            }

            logger.info('[DataEnrichmentService] Suggestions auto-approved', {
                jobId,
                count: approved,
                threshold: confidenceThreshold
            });

            return approved;
        } catch (error) {
            logger.error('[DataEnrichmentService] Error auto-approving:', error);
            throw error;
        }
    }

    /**
     * Get job details
     */
    async getJob(jobId) {
        try {
            const job = await db.data_enrichment_job.findByPk(jobId, {
                include: [
                    { model: db.data_enrichment_suggestion, as: 'suggestions' },
                    { model: db.user, as: 'creator' }
                ]
            });
            return job;
        } catch (error) {
            logger.error('[DataEnrichmentService] Error getting job:', error);
            throw error;
        }
    }

    /**
     * List all jobs with pagination and filtering
     * @param {Object} filters - { status, jobType, limit, offset, sortBy, sortOrder }
     * @returns {Promise<{jobs: Array, total: number}>}
     */
    async listJobs(filters = {}) {
        try {
            const where = {};
            if (filters.status) where.status = filters.status;
            if (filters.jobType) where.jobType = filters.jobType;

            const order = [[filters.sortBy || 'createdAt', filters.sortOrder || 'DESC']];

            const { count, rows } = await db.data_enrichment_job.findAndCountAll({
                where,
                order,
                limit: filters.limit || 50,
                offset: filters.offset || 0,
                include: [
                    { model: db.user, as: 'creator', attributes: ['id', 'firstName', 'name', 'email'] }
                ]
            });

            return { jobs: rows, total: count };
        } catch (error) {
            logger.error('[DataEnrichmentService] Error listing jobs:', error);
            throw error;
        }
    }

    /**
     * Cancel a running or pending job
     * @param {string} jobId
     * @returns {Promise<Object>} Updated job
     */
    async cancelJob(jobId) {
        try {
            const job = await db.data_enrichment_job.findByPk(jobId);
            if (!job) {
                throw new Error(`Job ${jobId} nicht gefunden`);
            }

            if (!['pending', 'running'].includes(job.status)) {
                throw new Error(`Job kann nicht abgebrochen werden (Status: ${job.status})`);
            }

            await job.update({
                status: 'cancelled',
                completedAt: new Date(),
                errorMessage: 'Job wurde manuell abgebrochen'
            });

            logger.info(`[DataEnrichmentService] Job cancelled: ${jobId}`);
            return job;
        } catch (error) {
            logger.error('[DataEnrichmentService] Error cancelling job:', error);
            throw error;
        }
    }

    /**
     * Delete a completed, failed, or cancelled job and its suggestions
     * @param {string} jobId
     * @returns {Promise<{deletedSuggestions: number}>}
     */
    async deleteJob(jobId) {
        try {
            const job = await db.data_enrichment_job.findByPk(jobId);
            if (!job) {
                throw new Error(`Job ${jobId} nicht gefunden`);
            }

            if (['pending', 'running'].includes(job.status)) {
                throw new Error(`Laufende oder ausstehende Jobs können nicht gelöscht werden. Bitte zuerst abbrechen.`);
            }

            // Delete associated suggestions first
            const deletedSuggestions = await db.data_enrichment_suggestion.destroy({
                where: { jobId }
            });

            // Delete the job
            await job.destroy();

            logger.info(`[DataEnrichmentService] Job deleted: ${jobId}`, {
                deletedSuggestions
            });

            return { deletedSuggestions };
        } catch (error) {
            logger.error('[DataEnrichmentService] Error deleting job:', error);
            throw error;
        }
    }

    /**
     * Get all suggestions for a job
     */
    async getJobSuggestions(jobId, filters = {}) {
        try {
            const where = { jobId };
            if (filters.status) where.status = filters.status;
            if (filters.minConfidence) {
                where.confidence = { [db.Sequelize.Op.gte]: filters.minConfidence };
            }

            const suggestions = await db.data_enrichment_suggestion.findAll({
                where,
                order: [['confidence', 'DESC']],
                limit: filters.limit || 100,
                offset: filters.offset || 0
            });

            return suggestions;
        } catch (error) {
            logger.error('[DataEnrichmentService] Error getting suggestions:', error);
            throw error;
        }
    }

    /**
     * Review and update suggestion status
     */
    async reviewSuggestion(suggestionId, status, userId) {
        try {
            if (!['approved', 'rejected'].includes(status)) {
                throw new Error('Invalid status: must be "approved" or "rejected"');
            }

            const suggestion = await db.data_enrichment_suggestion.findByPk(suggestionId);
            if (!suggestion) {
                throw new Error(`Suggestion ${suggestionId} not found`);
            }

            await suggestion.update({
                status,
                reviewedAt: new Date(),
                reviewedBy: userId
            });

            logger.info('[DataEnrichmentService] Suggestion reviewed', {
                suggestionId,
                newStatus: status,
                reviewedBy: userId
            });

            return suggestion;
        } catch (error) {
            logger.error('[DataEnrichmentService] Error reviewing suggestion:', error);
            throw error;
        }
    }

    /**
     * Apply approved suggestion
     */
    async applySuggestion(suggestionId, userId) {
        try {
            const suggestion = await db.data_enrichment_suggestion.findByPk(suggestionId);
            if (!suggestion) {
                throw new Error(`Suggestion ${suggestionId} not found`);
            }

            if (suggestion.status !== 'approved') {
                throw new Error('Only approved suggestions can be applied');
            }

            // Apply to entity based on type
            const entityModel = this.getModelForEntityType(suggestion.entityType);
            const entity = await entityModel.findByPk(suggestion.entityId);

            if (entity) {
                await entity.update({
                    [suggestion.fieldName]: suggestion.suggestedValue
                });
            }

            // Mark suggestion as applied
            await suggestion.update({
                status: 'applied',
                appliedAt: new Date()
            });

            logger.info('[DataEnrichmentService] Suggestion applied', {
                suggestionId,
                entityType: suggestion.entityType,
                entityId: suggestion.entityId,
                field: suggestion.fieldName
            });

            return suggestion;
        } catch (error) {
            logger.error('[DataEnrichmentService] Error applying suggestion:', error);
            throw error;
        }
    }

    /**
     * Get appropriate model for entity type
     */
    getModelForEntityType(entityType) {
        switch (entityType) {
            case 'piece':
                return db.piece;
            case 'composer':
                return db.composer;
            case 'publisher':
                return db.publisher;
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    /**
     * Get enrichment statistics
     */
    async getStatistics(filters = {}) {
        try {
            const where = {};
            if (filters.dateFrom) {
                where.createdAt = { [db.Sequelize.Op.gte]: new Date(filters.dateFrom) };
            }
            if (filters.dateTo) {
                where.createdAt = { ...where.createdAt, [db.Sequelize.Op.lte]: new Date(filters.dateTo) };
            }

            const jobs = await db.data_enrichment_job.findAll({ where });

            const stats = {
                totalJobs: jobs.length,
                completedJobs: jobs.filter(j => j.status === 'completed').length,
                failedJobs: jobs.filter(j => j.status === 'failed').length,
                totalCosts: jobs.reduce((sum, j) => sum + (parseFloat(j.apiCosts) || 0), 0),
                totalSuggestions: 0,
                appliedSuggestions: 0
            };

            // Count suggestions
            const suggestions = await db.data_enrichment_suggestion.findAll({
                where,
                attributes: [
                    'status',
                    [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
                ],
                group: ['status'],
                raw: true
            });

            for (const data of suggestions) {
                const count = parseInt(data.count, 10) || 0;
                stats.totalSuggestions += count;
                if (data.status === 'applied') {
                    stats.appliedSuggestions += count;
                }
            }

            return stats;
        } catch (error) {
            logger.error('[DataEnrichmentService] Error getting statistics:', error);
            throw error;
        }
    }

    /**
     * Test provider connections
     */
    async testProviders() {
        if (!this.initialized) await this.initialize();
        return this.router.testAllConnections();
    }

    /**
     * Test a specific API key directly against a provider
     * @param {string} provider - Provider name ('gemini', 'claude')
     * @param {string} apiKey - The raw API key to test
     * @returns {Promise<Object>} { ok: boolean, message: string }
     */
    async testApiKeyDirect(provider, apiKey) {
        if (!this.initialized) await this.initialize();

        const providerInstance = this.router.providers[provider];
        if (!providerInstance) {
            return { ok: false, message: `Provider '${provider}' nicht verfügbar` };
        }

        if (typeof providerInstance.testApiKeyDirect !== 'function') {
            return { ok: false, message: `Provider '${provider}' unterstützt keinen direkten API-Key-Test` };
        }

        return providerInstance.testApiKeyDirect(apiKey);
    }

    /**
     * Get available providers
     */
    getAvailableProviders() {
        if (!this.router) return [];
        return this.router.getAvailableProviders();
    }

    /**
     * Load API keys from database into provider instances
     * Bridges the gap between DB-stored keys and env-var-based providers
     */
    async loadApiKeysIntoProviders() {
        if (!this.router) return;

        const providerNames = Object.keys(this.router.providers);
        for (const name of providerNames) {
            try {
                const apiKey = await dataEnrichmentSettingsService.get(`api_key_${name}`);
                if (apiKey) {
                    this.router.providers[name].apiKey = apiKey;
                    this.router.providers[name].isConfigured = true;
                    logger.debug(`[DataEnrichmentService] API key loaded from DB for provider: ${name}`);
                }
            } catch (error) {
                logger.warn(`[DataEnrichmentService] Could not load API key for ${name}:`, error.message);
            }
        }
    }

    /**
     * Delete API key for a provider
     * @param {string} provider - Provider name
     * @returns {Promise<boolean>}
     */
    async deleteApiKey(provider) {
        const settingKey = `api_key_${provider.toLowerCase()}`;
        const deleted = await dataEnrichmentSettingsService.delete(settingKey);

        // Also clear from provider instance
        if (this.router?.providers[provider.toLowerCase()]) {
            this.router.providers[provider.toLowerCase()].apiKey = null;
            this.router.providers[provider.toLowerCase()].isConfigured = false;
        }

        logger.info(`[DataEnrichmentService] API key deleted for provider: ${provider}`);
        return deleted;
    }

    /**
     * Get API key status for all providers
     * Returns masked keys and availability status
     * @returns {Promise<Object>}
     */
    async getApiKeyStatus() {
        const status = {};
        const providerNames = ['gemini', 'claude', 'openai'];

        for (const name of providerNames) {
            try {
                const apiKey = await dataEnrichmentSettingsService.get(`api_key_${name}`);
                status[name] = {
                    configured: !!apiKey,
                    maskedKey: apiKey ? this.maskApiKeyValue(apiKey) : null
                };
            } catch {
                status[name] = { configured: false, maskedKey: null };
            }
        }

        return status;
    }

    /**
     * Mask an API key for display: show first 4 chars, rest as asterisks
     * @param {string} key - The decrypted API key
     * @returns {string}
     */
    maskApiKeyValue(key) {
        if (!key || key.length <= 4) return '****';
        const visibleChars = Math.min(4, Math.floor(key.length * 0.2));
        return key.slice(0, visibleChars) + '*'.repeat(Math.min(key.length - visibleChars, 20));
    }
}

module.exports = new DataEnrichmentService();
