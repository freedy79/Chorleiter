/**
 * Base class for LLM providers
 * All provider implementations must extend this class
 */

const logger = require('../../config/logger');

class LLMProvider {
    constructor(providerName, config = {}) {
        this.providerName = providerName;
        this.config = config;
        this.apiKey = process.env[`LLM_${providerName.toUpperCase()}_API_KEY`];
        this.isConfigured = !!this.apiKey;
    }

    /**
     * Validate if provider is properly configured and API key is available
     * @returns {boolean}
     */
    isAvailable() {
        return this.isConfigured && !!this.apiKey;
    }

    /**
     * Enrich a batch of entities with metadata and suggestions
     * Must be implemented by subclass
     * 
     * @param {Array} pieces - Array of piece objects to enrich
     * @param {Array} enrichmentFields - Fields to enrich (e.g., ['opus', 'voicing', 'durationSec'])
     * @returns {Promise<Object>} { suggestions: [], costs: 0, tokensUsed: 0 }
     */
    async enrichPieces(pieces, enrichmentFields) {
        throw new Error(`enrichPieces() must be implemented by ${this.providerName}`);
    }

    /**
     * Enrich composers with metadata
     * @param {Array} composers - Array of composer objects
     * @param {Array} enrichmentFields - Fields to enrich
     * @returns {Promise<Object>}
     */
    async enrichComposers(composers, enrichmentFields) {
        throw new Error(`enrichComposers() must be implemented by ${this.providerName}`);
    }

    /**
     * Enrich publishers with metadata
     * @param {Array} publishers - Array of publisher objects
     * @param {Array} enrichmentFields - Fields to enrich
     * @returns {Promise<Object>}
     */
    async enrichPublishers(publishers, enrichmentFields) {
        throw new Error(`enrichPublishers() must be implemented by ${this.providerName}`);
    }

    /**
     * Test connection to provider
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        throw new Error(`testConnection() must be implemented by ${this.providerName}`);
    }

    /**
     * Get pricing information for this provider
     * @returns {Object} { costPerPiece: 0.0001, costPerComposer: 0.00005, ... }
     */
    getPricing() {
        throw new Error(`getPricing() must be implemented by ${this.providerName}`);
    }

    /**
     * Format error message from provider
     * @param {Error} error
     * @returns {string}
     */
    formatErrorMessage(error) {
        if (error.response?.data?.error?.message) {
            return error.response.data.error.message;
        }
        if (error.message) {
            return error.message;
        }
        return 'Unknown error from provider';
    }

    /**
     * Log provider operation
     * @param {string} operation
     * @param {Object} metadata
     */
    logOperation(operation, metadata = {}) {
        logger.info(`[LLM:${this.providerName}] ${operation}`, metadata);
    }

    /**
     * Build enrichment prompt for a piece
     * @param {Object} piece
     * @param {Array} enrichmentFields
     * @returns {string}
     */
    buildPieceEnrichmentPrompt(piece, enrichmentFields) {
        const fields = enrichmentFields
            .map(field => `- ${field}`)
            .join('\n');

        return `
You are a music metadata enrichment expert. Given information about a music piece, 
provide accurate metadata for missing or incomplete fields.

Piece Information:
- Title: ${piece.title || 'unknown'}
- Composer: ${piece.composer?.name || 'unknown'}
- Category: ${piece.category?.name || 'unknown'}

Fields to enrich (if missing or incomplete):
${fields}

Please provide accurate metadata based on your knowledge. For each field, provide:
1. The suggested value
2. Confidence score (0-1)
3. Source of information (e.g., "IMSLP", "Wikidata", "Standard knowledge")

Format your response as JSON:
{
  "enrichments": [
    {
      "fieldName": "field",
      "suggestedValue": "value",
      "confidence": 0.95,
      "source": "source",
      "reasoning": "why you suggest this"
    }
  ]
}
`;
    }

    /**
     * Parse enrichment response
     * @param {string} response
     * @returns {Array}
     */
    parseEnrichmentResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                logger.warn(`[LLM:${this.providerName}] Could not find JSON in response`);
                return [];
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.enrichments || [];
        } catch (error) {
            logger.error(`[LLM:${this.providerName}] Error parsing enrichment response:`, error);
            return [];
        }
    }
}

module.exports = LLMProvider;
