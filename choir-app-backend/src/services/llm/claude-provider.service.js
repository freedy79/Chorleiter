/**
 * Anthropic Claude Sonnet 4 Provider
 * Fallback provider: More expensive but better for complex enrichment tasks
 * Use when Gemini confidence is low or for specialized music knowledge
 */

const LLMProvider = require('./llm-provider.interface');
const axios = require('axios');
const logger = require('../../config/logger');

class ClaudeProvider extends LLMProvider {
    constructor() {
        super('claude', {
            modelName: 'claude-sonnet-4-20250514',
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
    async enrichPieces(pieces, enrichmentFields, progressCallback = null) {
        if (!this.isAvailable()) {
            throw new Error('Claude API key not configured');
        }

        try {
            const suggestions = [];
            let totalCost = 0;
            let totalTokens = 0;
            let samplePrompt = null;
            let sampleResponse = null;

            // Process in smaller batches for better quality
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
                provider: 'claude',
                samplePrompt,
                sampleResponse
            };
        } catch (error) {
            logger.error('[Claude] Error enriching pieces:', error);
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
     * Call Claude API with automatic retry on transient errors (429, 529)
     */
    async callAPI(prompt, retries = 3) {
        const url = `${this.config.baseUrl}/messages`;

        for (let attempt = 1; attempt <= retries; attempt++) {
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
                    timeout: 60000
                });

                const responseText = response.data?.content?.[0]?.text || '';
                const suggestions = this.parseEnrichmentResponse(responseText);

                // Calculate cost (Claude Sonnet: $3 per 1M input tokens, $15 per 1M output tokens)
                const inputTokens = response.data?.usage?.input_tokens || Math.ceil(prompt.length / 4);
                const outputTokens = response.data?.usage?.output_tokens || Math.ceil(responseText.length / 4);
                const estimatedCost = (inputTokens * 3 + outputTokens * 15) / 1_000_000;

                return {
                    suggestions,
                    estimatedCost,
                    tokensUsed: inputTokens + outputTokens,
                    modelUsed: this.config.modelName,
                    rawResponse: responseText
                };
            } catch (error) {
                const status = error.response?.status;
                const isRetryable = status === 429 || status === 529;

                if (isRetryable && attempt < retries) {
                    const retryAfterHeader = error.response?.headers?.['retry-after'];
                    const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : Math.pow(2, attempt) * 5000;
                    const waitMs = Math.min(retryAfterMs, 60000); // max 60s
                    logger.warn(`[Claude] Overloaded (${status}), retry ${attempt}/${retries - 1} after ${waitMs / 1000}s`);
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                    continue;
                }

                throw new Error(`Claude API call failed: ${this.formatErrorMessage(error)}`);
            }
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
     * Test connection with a specific API key (without changing the instance key)
     * @param {string} apiKey - The API key to test
     * @returns {Promise<Object>} { ok: boolean, message: string }
     */
    async testApiKeyDirect(apiKey) {
        const url = `${this.config.baseUrl}/messages`;

        try {
            await axios.post(url, {
                model: this.config.modelName,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Respond with "OK" only.' }]
            }, {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                timeout: 15000
            });

            return { ok: true, message: 'Claude API-Key ist gültig' };
        } catch (error) {
            const msg = error.response?.data?.error?.message || error.message;
            return { ok: false, message: `Claude API-Key ungültig: ${msg}` };
        }
    }

    /**
     * Get pricing information
     */
    getPricing() {
        return {
            name: 'Claude Sonnet 4',
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

        return `Enrich music metadata using IMSLP, Wikidata, and standard music references. Only fill fields you know with high confidence (0.8+).${webContextBlock}

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

module.exports = ClaudeProvider;
