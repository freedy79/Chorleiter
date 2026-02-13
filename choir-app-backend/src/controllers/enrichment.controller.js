/**
 * Data Enrichment Admin Controller
 * Handles API requests for the admin data enrichment dashboard
 */

const asyncHandler = require('express-async-handler');
const logger = require('../config/logger');
const dataEnrichmentService = require('../services/data-enrichment.service');
const { dataEnrichmentSettingsService } = require('../services/llm');

/**
 * GET /api/admin/enrichment/settings
 * Get all enrichment settings (without encrypted API keys)
 */
exports.getSettings = asyncHandler(async (req, res) => {
    try {
        const settings = await dataEnrichmentSettingsService.getAll();

        res.json({
            success: true,
            settings
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error getting settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving settings',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/enrichment/settings
 * Update enrichment setting
 */
exports.updateSetting = asyncHandler(async (req, res) => {
    const { key, value, dataType } = req.body;

    if (!key || value === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: key, value'
        });
    }

    try {
        const result = await dataEnrichmentSettingsService.set(
            key,
            value,
            dataType || 'string',
            req.userId
        );

        res.json({
            success: true,
            message: 'Setting updated successfully',
            setting: result
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error updating setting:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating setting',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/enrichment/api-keys
 * Set LLM provider API key (encrypted storage)
 */
exports.setApiKey = asyncHandler(async (req, res) => {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: provider, apiKey'
        });
    }

    const allowedProviders = ['gemini', 'claude', 'openai'];
    if (!allowedProviders.includes(provider.toLowerCase())) {
        return res.status(400).json({
            success: false,
            message: `Invalid provider. Allowed: ${allowedProviders.join(', ')}`
        });
    }

    try {
        const settingKey = `api_key_${provider.toLowerCase()}`;
        const result = await dataEnrichmentSettingsService.set(
            settingKey,
            apiKey,
            'string',
            req.userId
        );

        // Test connection
        const testResult = await dataEnrichmentService.testProviders();

        res.json({
            success: true,
            message: `API key for ${provider} saved and encrypted`,
            provider,
            saved: result.saved,
            encrypted: result.encrypted,
            connectionTest: testResult[provider]
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error setting API key:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting API key',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/enrichment/providers
 * Get available LLM providers and their status
 */
exports.getProviders = asyncHandler(async (req, res) => {
    try {
        await dataEnrichmentService.initialize();
        const providers = dataEnrichmentService.getAvailableProviders();
        const connectionTests = await dataEnrichmentService.testProviders();

        res.json({
            success: true,
            providers: providers.map(p => ({
                ...p,
                connection: connectionTests[p.name]
            }))
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error getting providers:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving provider information',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/enrichment/jobs
 * Create new enrichment job
 */
exports.createJob = asyncHandler(async (req, res) => {
    const { jobType, enrichmentFields, options } = req.body;

    if (!jobType || !enrichmentFields || !Array.isArray(enrichmentFields)) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: jobType, enrichmentFields (array)'
        });
    }

    const allowedJobTypes = ['piece', 'composer', 'publisher'];
    if (!allowedJobTypes.includes(jobType)) {
        return res.status(400).json({
            success: false,
            message: `Invalid jobType. Allowed: ${allowedJobTypes.join(', ')}`
        });
    }

    try {
        await dataEnrichmentService.initialize();

        const result = await dataEnrichmentService.createEnrichmentJob(
            jobType,
            enrichmentFields,
            options || {},
            req.userId
        );

        res.status(201).json({
            success: true,
            message: 'Enrichment job created',
            job: result
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error creating job:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating enrichment job',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/enrichment/jobs/:jobId
 * Get job details and suggestions
 */
exports.getJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    try {
        await dataEnrichmentService.initialize();
        const job = await dataEnrichmentService.getJob(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        res.json({
            success: true,
            job: {
                id: job.id,
                jobType: job.jobType,
                status: job.status,
                totalItems: job.totalItems,
                processedItems: job.processedItems,
                successCount: job.successCount,
                errorCount: job.errorCount,
                apiCosts: job.apiCosts,
                llmProvider: job.llmProvider,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                createdAt: job.createdAt,
                suggestions: job.suggestions?.map(s => ({
                    id: s.id,
                    fieldName: s.fieldName,
                    originalValue: s.originalValue,
                    suggestedValue: s.suggestedValue,
                    confidence: s.confidence,
                    source: s.source,
                    status: s.status
                })) || []
            }
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error getting job:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving job',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/enrichment/suggestions
 * Get suggestions with filtering
 */
exports.getSuggestions = asyncHandler(async (req, res) => {
    const { jobId, status, minConfidence, limit, offset } = req.query;

    if (!jobId) {
        return res.status(400).json({
            success: false,
            message: 'jobId query parameter is required'
        });
    }

    try {
        await dataEnrichmentService.initialize();

        const filters = {
            status,
            minConfidence: minConfidence ? parseFloat(minConfidence) : undefined,
            limit: limit ? parseInt(limit) : 100,
            offset: offset ? parseInt(offset) : 0
        };

        const suggestions = await dataEnrichmentService.getJobSuggestions(
            jobId,
            filters
        );

        res.json({
            success: true,
            count: suggestions.length,
            suggestions
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error getting suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving suggestions',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/enrichment/suggestions/:suggestionId/review
 * Review a suggestion (approve/reject)
 */
exports.reviewSuggestion = asyncHandler(async (req, res) => {
    const { suggestionId } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status. Must be "approved" or "rejected"'
        });
    }

    try {
        await dataEnrichmentService.initialize();

        const suggestion = await dataEnrichmentService.reviewSuggestion(
            suggestionId,
            status,
            req.userId
        );

        res.json({
            success: true,
            message: `Suggestion ${status}`,
            suggestion
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error reviewing suggestion:', error);
        res.status(500).json({
            success: false,
            message: 'Error reviewing suggestion',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/enrichment/suggestions/:suggestionId/apply
 * Apply approved suggestion to entity
 */
exports.applySuggestion = asyncHandler(async (req, res) => {
    const { suggestionId } = req.params;

    try {
        await dataEnrichmentService.initialize();

        const suggestion = await dataEnrichmentService.applySuggestion(
            suggestionId,
            req.userId
        );

        res.json({
            success: true,
            message: 'Suggestion applied successfully',
            suggestion
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error applying suggestion:', error);
        res.status(500).json({
            success: false,
            message: 'Error applying suggestion',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/enrichment/statistics
 * Get enrichment statistics
 */
exports.getStatistics = asyncHandler(async (req, res) => {
    const { dateFrom, dateTo } = req.query;

    try {
        await dataEnrichmentService.initialize();

        const filters = {
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined
        };

        const stats = await dataEnrichmentService.getStatistics(filters);

        res.json({
            success: true,
            statistics: stats
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error getting statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving statistics',
            error: error.message
        });
    }
});
