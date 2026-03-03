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
    async enrichPieces(pieces, enrichmentFields, progressCallback = null) {
        if (!this.isAvailable()) {
            throw new Error('Gemini API key not configured');
        }

        try {
            const suggestions = [];
            let totalCost = 0;
            let totalTokens = 0;
            let samplePrompt = null;
            let sampleResponse = null;

            // Process in batches
            for (let i = 0; i < pieces.length; i += this.config.batchSize) {
                const batch = pieces.slice(i, i + this.config.batchSize);
                const prompt = this.buildBatchEnrichmentPrompt(batch, enrichmentFields);

                const response = await this.callAPI(prompt);

                // Capture the first batch as sample for transparency
                if (i === 0) {
                    samplePrompt = prompt;
                    sampleResponse = response.rawResponse || null;
                }

                const batchSuggestions = response.suggestions || [];
                // Map pieceIndex → entityId using the actual batch items
                batchSuggestions.forEach(s => {
                    const item = batch[s.pieceIndex];
                    if (item) {
                        s.entityId = item.id;
                        s.pieceId = item.id;
                    }
                });
                suggestions.push(...batchSuggestions);

                totalCost += response.estimatedCost || 0;
                totalTokens += response.tokensUsed || 0;

                this.logOperation('Batch enriched', {
                    batchSize: batch.length,
                    suggestionsFound: batchSuggestions.length,
                    cost: response.estimatedCost
                });

                if (progressCallback) {
                    await progressCallback({
                        processed: Math.min(i + this.config.batchSize, pieces.length),
                        total: pieces.length,
                        batchSuggestions: batchSuggestions.length,
                        totalCostSoFar: totalCost
                    });
                }
            }

            return {
                suggestions,
                totalCost,
                totalTokens,
                provider: 'gemini',
                samplePrompt,
                sampleResponse
            };
        } catch (error) {
            logger.error('[Gemini] Error enriching pieces:', error);
            throw error;
        }
    }

    /**
     * Enrich composers
     */
    async enrichComposers(composers, enrichmentFields, progressCallback = null) {
        return this.enrichPieces(composers, enrichmentFields, progressCallback);
    }

    /**
     * Enrich publishers
     */
    async enrichPublishers(publishers, enrichmentFields, progressCallback = null) {
        return this.enrichPieces(publishers, enrichmentFields, progressCallback);
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
                modelUsed: this.config.modelName,
                rawResponse: responseText
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
     * Test connection with a specific API key (without changing the instance key)
     * @param {string} apiKey - The API key to test
     * @returns {Promise<Object>} { ok: boolean, message: string }
     */
    async testApiKeyDirect(apiKey) {
        const url = `${this.config.baseUrl}/${this.config.modelName}:generateContent`;

        try {
            await axios.post(url, {
                contents: [{ parts: [{ text: 'Respond with "OK" only.' }] }],
                generationConfig: { maxOutputTokens: 10 }
            }, {
                params: { key: apiKey },
                timeout: 15000
            });

            return { ok: true, message: 'Gemini API-Key ist gültig' };
        } catch (error) {
            const msg = error.response?.data?.error?.message || error.message;
            return { ok: false, message: `Gemini API-Key ungültig: ${msg}` };
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
     * Build compact batch enrichment prompt (pieces or composers)
     * Only includes non-empty field values to minimize token usage
     */
    buildBatchEnrichmentPrompt(batch, enrichmentFields) {
        // Detect entity type from first item
        const isComposer = batch[0] && batch[0].title === undefined && (batch[0].birthYear !== undefined || batch[0].deathYear !== undefined || (batch[0].name !== undefined && batch[0].composer === undefined));

        if (isComposer) {
            return this.buildComposerEnrichmentPrompt(batch, enrichmentFields);
        }

        const FIELD_LABELS = { subtitle: 'Untertitel', lyrics: 'Liedtext', lyricsSource: 'Textquelle', key: 'Tonart', voicing: 'Besetzung', durationSec: 'Sekunden', opus: 'Opusnummer' };

        const piecesData = batch.map((piece, idx) => {
            const attrs = [];
            if (piece.composer?.name) attrs.push(`Composer: ${piece.composer.name}`);
            if (piece.category?.name) attrs.push(`Category: ${piece.category.name}`);
            if (piece.key) attrs.push(`Key: ${piece.key}`);
            if (piece.voicing) attrs.push(`Voicing: ${piece.voicing}`);
            if (piece.opus) attrs.push(`Opus: ${piece.opus}`);
            if (piece.durationSec) attrs.push(`Duration: ${piece.durationSec}s`);
            if (piece.subtitle) attrs.push(`Subtitle: ${piece.subtitle}`);
            if (piece.lyrics) attrs.push(`HasLyrics: yes`);
            if (piece.lyricsSource) attrs.push(`LyricsSource: ${piece.lyricsSource}`);
            const attrStr = attrs.length > 0 ? `\n  ${attrs.join('\n  ')}` : '';
            return `[${idx}] "${piece.title || '?'}"${attrStr}`;
        }).join('\n');

        const fieldHints = enrichmentFields
            .filter(f => FIELD_LABELS[f])
            .map(f => `${f}=${FIELD_LABELS[f]}`)
            .join(', ');

        // Include web context if available
        let webContextBlock = '';
        if (this.router) {
            const webCtx = this.router.getWebContext();
            if (webCtx && webCtx.size > 0) {
                const WebEnrichmentProvider = require('./web-enrichment-provider.service');
                webContextBlock = WebEnrichmentProvider.buildWebContextForPrompt(webCtx, batch);
                if (webContextBlock) {
                    webContextBlock = `\n\nWeb research results (use to validate/supplement your knowledge):\n${webContextBlock}\n`;
                }
            }
        }

        return `Enrich music metadata. Only fill fields you know with high confidence (0.8+).${webContextBlock}

Pieces:
${piecesData}

Fields to fill: ${enrichmentFields.join(', ')}${fieldHints ? `\n(${fieldHints})` : ''}

JSON only, no markdown:
{"enrichments":[{"pieceIndex":0,"fieldName":"opus","suggestedValue":"Op.9","confidence":0.95,"source":"IMSLP","reasoning":"brief reason"}]}`;
    }

    /**
     * Build compact composer enrichment prompt
     */
    buildComposerEnrichmentPrompt(batch, enrichmentFields) {
        const FIELD_LABELS = { name: 'Name', birthYear: 'Geburtsjahr', deathYear: 'Todesjahr' };

        const composersData = batch.map((composer, idx) => {
            const attrs = [];
            if (composer.birthYear) attrs.push(`Born: ${composer.birthYear}`);
            if (composer.deathYear) attrs.push(`Died: ${composer.deathYear}`);
            const attrStr = attrs.length > 0 ? `\n  ${attrs.join('\n  ')}` : '';
            return `[${idx}] "${composer.name || '?'}"${attrStr}`;
        }).join('\n');

        const fieldHints = enrichmentFields
            .filter(f => FIELD_LABELS[f])
            .map(f => `${f}=${FIELD_LABELS[f]}`)
            .join(', ');

        return `Enrich composer metadata. Only fill fields you know with high confidence (0.8+).

Composers:
${composersData}

Fields to fill: ${enrichmentFields.join(', ')}${fieldHints ? `\n(${fieldHints})` : ''}

JSON only, no markdown:
{"enrichments":[{"pieceIndex":0,"fieldName":"birthYear","suggestedValue":"1756","confidence":0.99,"source":"Wikipedia","reasoning":"brief reason"}]}`;
    }
}

module.exports = GeminiProvider;
