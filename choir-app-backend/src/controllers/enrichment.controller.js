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
        // Test the API key first before saving
        await dataEnrichmentService.initialize();
        const testResult = await dataEnrichmentService.testApiKeyDirect(provider.toLowerCase(), apiKey);

        if (!testResult.ok) {
            return res.status(400).json({
                success: false,
                message: testResult.message,
                connectionTest: testResult
            });
        }

        // Key is valid — save it
        const settingKey = `api_key_${provider.toLowerCase()}`;
        const result = await dataEnrichmentSettingsService.set(
            settingKey,
            apiKey,
            'string',
            req.userId
        );

        res.json({
            success: true,
            message: `API-Key für ${provider} geprüft, gespeichert und verschlüsselt`,
            provider,
            saved: result.saved,
            encrypted: result.encrypted,
            connectionTest: testResult
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
        // Load API keys from DB so provider status is accurate
        await dataEnrichmentService.loadApiKeysIntoProviders();
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

        // Return specific error message for provider issues
        const statusCode = error.message.includes('Kein LLM-Provider') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Error creating enrichment job',
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
                errorMessage: job.errorMessage || null,
                apiCosts: job.apiCosts,
                llmProvider: job.llmProvider,
                metadata: job.metadata,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                createdAt: job.createdAt,
                creator: job.creator ? {
                    id: job.creator.id,
                    firstName: job.creator.firstName,
                    name: job.creator.name
                } : null,
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
 * GET /api/admin/enrichment/jobs
 * List all enrichment jobs with optional filtering
 */
exports.listJobs = asyncHandler(async (req, res) => {
    const { status, jobType, limit, offset, sortBy, sortOrder } = req.query;

    try {
        await dataEnrichmentService.initialize();

        const filters = {
            status,
            jobType,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0,
            sortBy: sortBy || 'createdAt',
            sortOrder: sortOrder || 'DESC'
        };

        const result = await dataEnrichmentService.listJobs(filters);

        res.json({
            success: true,
            jobs: result.jobs.map(job => ({
                id: job.id,
                jobType: job.jobType,
                status: job.status,
                totalItems: job.totalItems,
                processedItems: job.processedItems,
                successCount: job.successCount,
                errorCount: job.errorCount,
                errorMessage: job.errorMessage || null,
                apiCosts: job.apiCosts,
                llmProvider: job.llmProvider,
                metadata: job.metadata,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                createdAt: job.createdAt,
                creator: job.creator ? {
                    id: job.creator.id,
                    firstName: job.creator.firstName,
                    name: job.creator.name
                } : null
            })),
            total: result.total
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error listing jobs:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing jobs',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/enrichment/jobs/:jobId/cancel
 * Cancel a running or pending job
 */
exports.cancelJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    try {
        await dataEnrichmentService.initialize();
        const job = await dataEnrichmentService.cancelJob(jobId);

        res.json({
            success: true,
            message: 'Job abgebrochen',
            job: {
                id: job.id,
                status: job.status,
                completedAt: job.completedAt
            }
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error cancelling job:', error);
        const statusCode = error.message.includes('nicht gefunden') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/admin/enrichment/jobs/:jobId
 * Delete a completed/failed/cancelled job and its suggestions
 */
exports.deleteJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    try {
        await dataEnrichmentService.initialize();
        const result = await dataEnrichmentService.deleteJob(jobId);

        res.json({
            success: true,
            message: 'Job und zugehörige Vorschläge gelöscht',
            deletedSuggestions: result.deletedSuggestions
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error deleting job:', error);
        const statusCode = error.message.includes('nicht gefunden') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: error.message
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
 * DELETE /api/admin/enrichment/api-keys/:provider
 * Delete API key for a provider
 */
exports.deleteApiKey = asyncHandler(async (req, res) => {
    const { provider } = req.params;

    const allowedProviders = ['gemini', 'claude', 'openai'];
    if (!allowedProviders.includes(provider.toLowerCase())) {
        return res.status(400).json({
            success: false,
            message: `Invalid provider. Allowed: ${allowedProviders.join(', ')}`
        });
    }

    try {
        await dataEnrichmentService.initialize();
        const deleted = await dataEnrichmentService.deleteApiKey(provider.toLowerCase());

        res.json({
            success: true,
            message: `API-Key für ${provider} gelöscht`,
            deleted
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error deleting API key:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting API key',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/enrichment/api-keys/status
 * Get API key status for all providers (masked keys + availability)
 */
exports.getApiKeyStatus = asyncHandler(async (req, res) => {
    try {
        await dataEnrichmentService.initialize();
        const status = await dataEnrichmentService.getApiKeyStatus();

        res.json({
            success: true,
            apiKeys: status
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error getting API key status:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving API key status',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/enrichment/web-sources
 * Get web enrichment source status (IMSLP, Musica International)
 */
exports.getWebSources = asyncHandler(async (req, res) => {
    try {
        await dataEnrichmentService.initialize();
        const status = await dataEnrichmentService.getWebSourceStatus();

        res.json({
            success: true,
            webSources: status
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error getting web source status:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving web source status',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/enrichment/web-sources/test
 * Test web source connections
 */
exports.testWebSources = asyncHandler(async (req, res) => {
    try {
        await dataEnrichmentService.initialize();
        const results = await dataEnrichmentService.testWebSources();

        res.json({
            success: true,
            results
        });
    } catch (error) {
        logger.error('[EnrichmentController] Error testing web sources:', error);
        res.status(500).json({
            success: false,
            message: 'Error testing web sources',
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
