/**
 * LLM Router Service
 * Intelligently selects and routes enrichment requests to appropriate providers
 * Supports multiple strategies: Primary only, Dual (with fallback), Budget-optimized
 */

const logger = require('../../config/logger');
const GeminiProvider = require('./gemini-provider.service');
const ClaudeProvider = require('./claude-provider.service');

class LLMRouter {
    constructor(settingsService) {
        this.settingsService = settingsService;
        this.cache = new Map();
        this.providers = {
            gemini: new GeminiProvider(),
            claude: new ClaudeProvider()
            // Additional providers can be added here
        };
        this.initialize();
    }

    /**
     * Initialize router with settings
     */
    async initialize() {
        try {
            const primaryProvider = await this.settingsService.get('llm_primary_provider');
            const fallbackProvider = await this.settingsService.get('llm_fallback_provider');
            const strategy = await this.settingsService.get('llm_routing_strategy') || 'dual';

            this.primaryProviderName = primaryProvider || 'gemini';
            this.fallbackProviderName = fallbackProvider || 'claude';
            this.strategy = strategy; // 'primary', 'dual', 'cost-optimized'

            logger.info('[LLMRouter] Initialized', {
                primary: this.primaryProviderName,
                fallback: this.fallbackProviderName,
                strategy: this.strategy
            });
        } catch (error) {
            logger.error('[LLMRouter] Initialization error:', error);
            // Use defaults if settings service fails
            this.primaryProviderName = 'gemini';
            this.fallbackProviderName = 'claude';
            this.strategy = 'dual';
        }
    }

    /**
     * Get primary provider
     */
    getPrimaryProvider() {
        const provider = this.providers[this.primaryProviderName];
        if (!provider) {
            throw new Error(`Primary provider '${this.primaryProviderName}' not found`);
        }
        return provider;
    }

    /**
     * Get fallback provider
     */
    getFallbackProvider() {
        const provider = this.providers[this.fallbackProviderName];
        if (!provider) {
            throw new Error(`Fallback provider '${this.fallbackProviderName}' not found`);
        }
        return provider;
    }

    /**
     * Enrich pieces with intelligent provider routing
     * @param {Array} pieces - Pieces to enrich
     * @param {Array} enrichmentFields - Fields to enrich
     * @returns {Promise<Object>}
     */
    async enrichPieces(pieces, enrichmentFields) {
        const startTime = Date.now();

        try {
            logger.info('[LLMRouter] Starting enrichment', {
                pieceCount: pieces.length,
                fields: enrichmentFields,
                strategy: this.strategy
            });

            let result;

            switch (this.strategy) {
                case 'primary':
                    result = await this.enrichWithPrimary(pieces, enrichmentFields);
                    break;
                case 'dual':
                    result = await this.enrichWithDual(pieces, enrichmentFields);
                    break;
                case 'cost-optimized':
                    result = await this.enrichWithCostOptimized(pieces, enrichmentFields);
                    break;
                default:
                    result = await this.enrichWithDual(pieces, enrichmentFields);
            }

            const duration = Date.now() - startTime;
            logger.info('[LLMRouter] Enrichment completed', {
                duration: `${duration}ms`,
                suggestionsCount: result.suggestions?.length || 0,
                totalCost: result.totalCost,
                provider: result.provider
            });

            return result;
        } catch (error) {
            logger.error('[LLMRouter] Enrichment failed:', error);
            throw error;
        }
    }

    /**
     * Enrich using primary provider only
     */
    async enrichWithPrimary(pieces, enrichmentFields) {
        const primaryProvider = this.getPrimaryProvider();

        if (!primaryProvider.isAvailable()) {
            throw new Error(`Primary provider '${this.primaryProviderName}' is not configured`);
        }

        return primaryProvider.enrichPieces(pieces, enrichmentFields);
    }

    /**
     * Enrich with dual strategy:
     * - Primary (Gemini) for all pieces
     * - Fallback (Claude) for low-confidence results from primary
     */
    async enrichWithDual(pieces, enrichmentFields) {
        const primaryProvider = this.getPrimaryProvider();

        if (!primaryProvider.isAvailable()) {
            logger.warn('[LLMRouter] Primary provider not available, using fallback');
            const fallbackProvider = this.getFallbackProvider();
            if (!fallbackProvider.isAvailable()) {
                throw new Error('No providers are available');
            }
            return fallbackProvider.enrichPieces(pieces, enrichmentFields);
        }

        // First pass: Use primary provider
        const primaryResult = await primaryProvider.enrichPieces(pieces, enrichmentFields);
        let { suggestions, totalCost } = primaryResult;

        // Second pass: For low-confidence results, use fallback provider
        const lowConfidenceSuggestions = suggestions.filter(s => s.confidence < 0.6);
        
        if (lowConfidenceSuggestions.length > 0) {
            const fallbackProvider = this.getFallbackProvider();
            if (fallbackProvider.isAvailable()) {
                logger.info('[LLMRouter] Using fallback provider for low-confidence results', {
                    count: lowConfidenceSuggestions.length
                });

                // Get pieces that need fallback
                const piecesNeedingFallback = [...new Set(
                    lowConfidenceSuggestions.map(s => s.pieceId)
                )];
                const piecesToRefine = pieces.filter(p => 
                    piecesNeedingFallback.includes(p.id)
                );

                const fallbackResult = await fallbackProvider.enrichPieces(
                    piecesToRefine,
                    enrichmentFields
                );

                // Merge results: prefer fallback suggestions for low-confidence fields
                suggestions = this.mergeSuggestions(suggestions, fallbackResult.suggestions);
                totalCost += fallbackResult.totalCost;
            }
        }

        return {
            suggestions,
            totalCost,
            provider: 'dual (primary + fallback)',
            primaryProvider: primaryProvider.providerName,
            fallbackUsed: lowConfidenceSuggestions.length > 0
        };
    }

    /**
     * Cost-optimized strategy:
     * Budget-aware enrichment, stops when budget is exceeded
     */
    async enrichWithCostOptimized(pieces, enrichmentFields) {
        const monthlyBudget = await this.settingsService.get('enrichment_monthly_budget') || 50;
        const currentMonthCost = await this.getCurrentMonthCost();
        const remainingBudget = monthlyBudget - currentMonthCost;

        if (remainingBudget <= 0) {
            throw new Error(`Monthly enrichment budget exceeded ($${monthlyBudget})`);
        }

        logger.info('[LLMRouter] Cost-optimized enrichment', {
            monthlyBudget,
            currentMonthCost,
            remainingBudget,
            piecesToProcess: pieces.length
        });

        const primaryProvider = this.getPrimaryProvider();

        if (!primaryProvider.isAvailable()) {
            throw new Error('Primary provider not configured for cost-optimized strategy');
        }

        // Use primary provider (cheaper)
        const result = await primaryProvider.enrichPieces(pieces, enrichmentFields);

        // Check if we can use fallback
        if (result.totalCost <= remainingBudget) {
            const fallbackProvider = this.getFallbackProvider();
            const lowConfidenceSuggestions = result.suggestions.filter(s => s.confidence < 0.7);

            if (lowConfidenceSuggestions.length > 0 && 
                fallbackProvider.isAvailable() &&
                (result.totalCost + (lowConfidenceSuggestions.length * 0.001)) <= remainingBudget) {
                
                const piecesNeedingFallback = [...new Set(
                    lowConfidenceSuggestions.map(s => s.pieceId)
                )];
                const piecesToRefine = pieces.filter(p => 
                    piecesNeedingFallback.includes(p.id)
                );

                const fallbackResult = await fallbackProvider.enrichPieces(
                    piecesToRefine,
                    enrichmentFields
                );

                result.suggestions = this.mergeSuggestions(
                    result.suggestions,
                    fallbackResult.suggestions
                );
                result.totalCost += fallbackResult.totalCost;
            }
        }

        return {
            ...result,
            remainingBudget: remainingBudget - result.totalCost,
            strategy: 'cost-optimized'
        };
    }

    /**
     * Merge suggestions from multiple providers
     * Prefers higher confidence scores
     */
    mergeSuggestions(primarySuggestions, fallbackSuggestions) {
        const merged = new Map();

        // Add primary suggestions
        primarySuggestions.forEach(s => {
            const key = `${s.entityId}:${s.fieldName}`;
            merged.set(key, s);
        });

        // Add/replace with fallback if higher confidence
        fallbackSuggestions.forEach(s => {
            const key = `${s.entityId}:${s.fieldName}`;
            const existing = merged.get(key);
            if (!existing || s.confidence > existing.confidence) {
                merged.set(key, s);
            }
        });

        return Array.from(merged.values());
    }

    /**
     * Get current month's enrichment costs
     */
    async getCurrentMonthCost() {
        try {
            const db = require('../../models');
            const currentMonth = new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);

            const result = await db.data_enrichment_job.sum('apiCosts', {
                where: {
                    createdAt: {
                        [db.Sequelize.Op.gte]: currentMonth
                    }
                }
            });

            return result || 0;
        } catch (error) {
            logger.warn('[LLMRouter] Could not get current month cost:', error);
            return 0;
        }
    }

    /**
     * Get all available providers
     */
    getAvailableProviders() {
        return Object.entries(this.providers).map(([name, provider]) => ({
            name,
            available: provider.isAvailable(),
            pricing: provider.getPricing()
        }));
    }

    /**
     * Test all provider connections
     */
    async testAllConnections() {
        const results = {};

        for (const [name, provider] of Object.entries(this.providers)) {
            results[name] = await provider.testConnection();
        }

        return results;
    }
}

module.exports = LLMRouter;
