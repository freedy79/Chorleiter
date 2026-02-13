/**
 * Data Enrichment Service
 * Orchestrates enrichment jobs and coordinates with LLM providers
 * Manages job execution, tracking, and suggestion storage
 */

const logger = require('../../config/logger');
const db = require('../../models');
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

            // Start async job execution
            this.executeJob(job.id, jobType, enrichmentFields, options)
                .catch(error => logger.error('[DataEnrichmentService] Job execution error:', error));

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
    async executeJob(jobId, jobType, enrichmentFields, options = {}) {
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

            // Get items to enrich
            const items = await this.getItemsToEnrich(jobType, options);
            await job.update({ totalItems: items.length });

            logger.info(`[DataEnrichmentService] Starting job execution`, {
                jobId,
                jobType,
                itemCount: items.length
            });

            // Call LLM router
            const result = await this.router.enrichPieces(items, enrichmentFields);

            // Store suggestions
            const suggestionsStored = await this.storeSuggestions(
                jobId,
                jobType,
                result.suggestions,
                userId
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
            logger.error(`[DataEnrichmentService] Job failed: ${jobId}`, error);

            // Update job to failed state
            try {
                const job = await db.data_enrichment_job.findByPk(jobId);
                if (job) {
                    await job.update({
                        status: 'failed',
                        errorMessage: error.message,
                        completedAt: new Date()
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
                totalCosts: jobs.reduce((sum, j) => sum + (j.apiCosts || 0), 0),
                totalSuggestions: 0,
                appliedSuggestions: 0
            };

            // Count suggestions
            const suggestions = await db.data_enrichment_suggestion.findAll({
                where,
                attributes: ['status'],
                group: ['status']
            });

            for (const data of suggestions) {
                stats.totalSuggestions += data.count;
                if (data.status === 'applied') {
                    stats.appliedSuggestions += data.count;
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
     * Get available providers
     */
    getAvailableProviders() {
        if (!this.router) return [];
        return this.router.getAvailableProviders();
    }
}

module.exports = new DataEnrichmentService();
