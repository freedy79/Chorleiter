/**
 * Anthropic Claude 3.5 Sonnet Provider
 * Fallback provider: More expensive but better for complex enrichment tasks
 * Use when Gemini confidence is low or for specialized music knowledge
 */

const LLMProvider = require('./llm-provider.interface');
const axios = require('axios');
const logger = require('../../config/logger');

class ClaudeProvider extends LLMProvider {
    constructor() {
        super('claude', {
            modelName: 'claude-3-5-sonnet-20241022',
            baseUrl: 'https://api.anthropic.com/v1',
            maxTokensPerRequest: 1024,
            maxTokensOutput: 2048,
            batchSize: 5 // Smaller batch size for better quality
        });
        this.apiKey = process.env.LLM_CLAUDE_API_KEY;
    }

    /**
     * Enrich pieces using Claude
     */
    async enrichPieces(pieces, enrichmentFields) {
        if (!this.isAvailable()) {
            throw new Error('Claude API key not configured');
        }

        try {
            const suggestions = [];
            let totalCost = 0;
            let totalTokens = 0;

            // Process in smaller batches for better quality
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
                provider: 'claude'
            };
        } catch (error) {
            logger.error('[Claude] Error enriching pieces:', error);
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
     * Call Claude API
     */
    async callAPI(prompt) {
        const url = `${this.config.baseUrl}/messages`;

        try {
            const response = await axios.post(url, {
                model: this.config.modelName,
                max_tokens: this.config.maxTokensOutput,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                system: 'You are a music metadata enrichment expert with deep knowledge of classical and contemporary music. Provide accurate, well-sourced metadata completions.'
            }, {
                headers: {
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                timeout: 30000
            });

            const responseText = response.data?.content?.[0]?.text || '';
            const suggestions = this.parseEnrichmentResponse(responseText);

            // Calculate cost (Claude 3.5 Sonnet: $3 per 1M input tokens, $15 per 1M output tokens)
            const inputTokens = response.data?.usage?.input_tokens || Math.ceil(prompt.length / 4);
            const outputTokens = response.data?.usage?.output_tokens || Math.ceil(responseText.length / 4);
            const estimatedCost = (inputTokens * 3 + outputTokens * 15) / 1_000_000;

            return {
                suggestions,
                estimatedCost,
                tokensUsed: inputTokens + outputTokens,
                modelUsed: this.config.modelName
            };
        } catch (error) {
            throw new Error(`Claude API call failed: ${this.formatErrorMessage(error)}`);
        }
    }

    /**
     * Test connection to Claude
     */
    async testConnection() {
        if (!this.isAvailable()) {
            return {
                ok: false,
                message: 'Claude API key not configured'
            };
        }

        try {
            const testPrompt = 'Respond with "OK" only.';
            await this.callAPI(testPrompt);
            return {
                ok: true,
                message: 'Claude connection successful'
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
            name: 'Claude 3.5 Sonnet',
            inputCostPerMillionTokens: 3,
            outputCostPerMillionTokens: 15,
            estimatedCostPerPiece: 0.001667, // Higher than Gemini
            estimatedCostPerComposer: 0.001,
            estimatedCostPerPublisher: 0.001,
            batchSize: this.config.batchSize,
            recommendedFor: 'Complex enrichment, low-confidence Gemini results, specialized knowledge'
        };
    }

    /**
     * Build batch enrichment prompt
     */
    buildBatchEnrichmentPrompt(batch, enrichmentFields) {
        const piecesData = batch.map((piece, idx) => `
Piece ${idx + 1}:
- Title: "${piece.title || 'unknown'}"
- Composer: "${piece.composer?.name || 'unknown'}"
- Current Key: "${piece.key || 'unknown'}"
- Current Voicing: "${piece.voicing || 'unknown'}"
- Current Duration: ${piece.durationSec || 'unknown'} seconds
- Current Opus: "${piece.opus || 'unknown'}"
- Category: "${piece.category?.name || 'unknown'}"
`).join('\n');

        const fields = enrichmentFields
            .map(field => `- ${field}`)
            .join('\n');

        return `
You are a music metadata enrichment expert. For the following pieces, provide accurate metadata
enrichment. Use your knowledge of music history, musicological databases (IMSLP, Wikidata, MusicBrainz),
and standard music references.

Pieces to enrich:
${piecesData}

Fields to enrich (provide only if you have high confidence):
${fields}

For each piece, provide complete and accurate metadata. Confidence scores:
- 0.9-1.0: Well-known works, documented in standard references
- 0.7-0.9: Known works with some uncertainty
- 0.5-0.7: Reasonable estimates based on style/period
- Below 0.5: Don't include unless you're sure

Response must be ONLY valid JSON (no markdown, no extra text):
{
  "enrichments": [
    {
      "pieceIndex": 0,
      "fieldName": "opus",
      "suggestedValue": "Op. 123",
      "confidence": 0.95,
      "source": "IMSLP",
      "reasoning": "Standard opus number from IMSLP database"
    }
  ]
}
`;
    }
}

module.exports = ClaudeProvider;
