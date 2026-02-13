/**
 * Google Gemini 1.5 Flash Provider
 * Primary provider: Cheapest ($0.000075/1K input tokens) and fastest
 * Recommended for 95%+ of enrichment tasks
 */

const LLMProvider = require('./llm-provider.interface');
const axios = require('axios');
const logger = require('../../config/logger');

class GeminiProvider extends LLMProvider {
    constructor() {
        super('gemini', {
            modelName: 'gemini-1.5-flash',
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
            maxTokensPerRequest: 1000,
            batchSize: 10
        });
        this.apiKey = process.env.LLM_GEMINI_API_KEY;
    }

    /**
     * Enrich pieces using Gemini
     * @param {Array} pieces - Pieces to enrich
     * @param {Array} enrichmentFields - Fields to enrich
     * @returns {Promise<Object>}
     */
    async enrichPieces(pieces, enrichmentFields) {
        if (!this.isAvailable()) {
            throw new Error('Gemini API key not configured');
        }

        try {
            const suggestions = [];
            let totalCost = 0;
            let totalTokens = 0;

            // Process in batches
            for (let i = 0; i < pieces.length; i += this.config.batchSize) {
                const batch = pieces.slice(i, i + this.config.batchSize);
                const prompt = this.buildBatchEnrichmentPrompt(batch, enrichmentFields);

                const response = await this.callAPI(prompt);
                
                const batchSuggestions = response.suggestions || [];
                suggestions.push(...batchSuggestions);

                totalCost += response.estimatedCost || 0;
                totalTokens += response.tokensUsed || 0;

                this.logOperation('Batch enriched', {
                    batchSize: batch.length,
                    suggestionsFound: batchSuggestions.length,
                    cost: response.estimatedCost
                });
            }

            return {
                suggestions,
                totalCost,
                totalTokens,
                provider: 'gemini'
            };
        } catch (error) {
            logger.error('[Gemini] Error enriching pieces:', error);
            throw error;
        }
    }

    /**
     * Enrich composers
     */
    async enrichComposers(composers, enrichmentFields) {
        return this.enrichPieces(composers, enrichmentFields);
    }

    /**
     * Enrich publishers
     */
    async enrichPublishers(publishers, enrichmentFields) {
        return this.enrichPieces(publishers, enrichmentFields);
    }

    /**
     * Call Gemini API
     * @param {string} prompt
     * @returns {Promise<Object>}
     */
    async callAPI(prompt) {
        const url = `${this.config.baseUrl}/${this.config.modelName}:generateContent`;

        try {
            const response = await axios.post(url, {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.9,
                    maxOutputTokens: 2000
                }
            }, {
                params: {
                    key: this.apiKey
                },
                timeout: 30000
            });

            const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const suggestions = this.parseEnrichmentResponse(responseText);

            // Calculate cost (Gemini 1.5 Flash: $0.075 per 1M input tokens, $0.3 per 1M output tokens)
            const inputTokens = Math.ceil(prompt.length / 4);
            const outputTokens = Math.ceil(responseText.length / 4);
            const estimatedCost = (inputTokens * 0.075 + outputTokens * 0.3) / 1_000_000;

            return {
                suggestions,
                estimatedCost,
                tokensUsed: inputTokens + outputTokens,
                modelUsed: this.config.modelName
            };
        } catch (error) {
            throw new Error(`Gemini API call failed: ${this.formatErrorMessage(error)}`);
        }
    }

    /**
     * Test connection to Gemini
     */
    async testConnection() {
        if (!this.isAvailable()) {
            return {
                ok: false,
                message: 'Gemini API key not configured'
            };
        }

        try {
            const testPrompt = 'Respond with "OK" only.';
            await this.callAPI(testPrompt);
            return {
                ok: true,
                message: 'Gemini connection successful'
            };
        } catch (error) {
            return {
                ok: false,
                message: error.message
            };
        }
    }

    /**
     * Get pricing information
     */
    getPricing() {
        return {
            name: 'Gemini 1.5 Flash',
            inputCostPerMillionTokens: 0.075,
            outputCostPerMillionTokens: 0.3,
            estimatedCostPerPiece: 0.000035, // Average per piece
            estimatedCostPerComposer: 0.000025,
            estimatedCostPerPublisher: 0.000025,
            batchSize: this.config.batchSize,
            recommendedFor: '95% of enrichment tasks'
        };
    }

    /**
     * Build batch enrichment prompt for multiple pieces
     */
    buildBatchEnrichmentPrompt(batch, enrichmentFields) {
        const piecesData = batch.map((piece, idx) => `
Piece ${idx + 1}:
- Title: ${piece.title || 'unknown'}
- Composer: ${piece.composer?.name || 'unknown'}
- Key: ${piece.key || 'unknown'}
- Voicing: ${piece.voicing || 'unknown'}
- Duration: ${piece.durationSec || 'unknown'} seconds
- Opus: ${piece.opus || 'unknown'}
`).join('\n');

        const fields = enrichmentFields
            .map(field => `- ${field}`)
            .join('\n');

        return `
You are a music metadata enrichment expert. Given information about multiple music pieces, 
provide accurate metadata for missing or incomplete fields.

Pieces to enrich:
${piecesData}

Fields to enrich (if missing or incomplete):
${fields}

For EACH piece, provide metadata completion. Confidence should be high (0.8+) for well-known works, 
medium (0.5-0.8) for reasonable guesses, and low (<0.5) for uncertain values.

Format your response as JSON (DO NOT include markdown, just plain JSON):
{
  "enrichments": [
    {
      "pieceIndex": 0,
      "fieldName": "opus",
      "suggestedValue": "Op. 123",
      "confidence": 0.95,
      "source": "IMSLP",
      "reasoning": "This piece is well-documented in IMSLP"
    },
    {
      "pieceIndex": 0,
      "fieldName": "voicing",
      "suggestedValue": "SATB",
      "confidence": 0.92,
      "source": "Musicbrainz",
      "reasoning": "Standard voicing for this work"
    }
  ]
}
`;
    }
}

module.exports = GeminiProvider;
