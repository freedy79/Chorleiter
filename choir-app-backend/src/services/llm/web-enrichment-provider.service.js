/**
 * Web Enrichment Provider
 * Orchestrates web-based data sources (IMSLP, Musica International)
 * to pre-enrich pieces/composers with factual data before LLM processing.
 *
 * This provider runs as a "Phase 0" before LLM enrichment:
 *   1. Queries IMSLP and Musica International for each item
 *   2. Merges results, preferring higher-confidence web sources
 *   3. Returns suggestions with source attribution
 *   4. Optionally attaches web context to items for improved LLM prompts
 *
 * Web sources provide high-confidence factual data (0.90-0.98)
 * that supplements LLM-based suggestions.
 */

const logger = require('../../config/logger');
const IMSLPScraper = require('./imslp-scraper.service');
const MusicaNetScraper = require('./musicanet-scraper.service');

class WebEnrichmentProvider {
    constructor(settingsService) {
        this.settingsService = settingsService;
        this.imslp = new IMSLPScraper();
        this.musicanet = new MusicaNetScraper();
        this.enabled = true;
    }

    /**
     * Check if web enrichment sources are available/enabled
     * @returns {Promise<Object>}
     */
    async getSourceStatus() {
        const imslpEnabled = await this.isSourceEnabled('imslp');
        const musicanetEnabled = await this.isSourceEnabled('musicanet');

        return {
            imslp: {
                enabled: imslpEnabled,
                requiresAuth: false,
                name: 'IMSLP (International Music Score Library Project)'
            },
            musicanet: {
                enabled: musicanetEnabled,
                requiresAuth: true,
                name: 'Musica International'
            }
        };
    }

    /**
     * Check if a specific web source is enabled in settings
     * @param {string} source - 'imslp' or 'musicanet'
     * @returns {Promise<boolean>}
     */
    async isSourceEnabled(source) {
        if (!this.settingsService) return source === 'imslp'; // IMSLP default on
        const setting = await this.settingsService.get(`web_source_${source}_enabled`);
        // Default: IMSLP enabled, musicanet disabled (requires credentials)
        if (setting === null) return source === 'imslp';
        return setting === true || setting === 'true';
    }

    /**
     * Get Musica International credentials from settings
     * @returns {Promise<Object|null>}
     */
    async getMusicaNetCredentials() {
        if (!this.settingsService) return null;
        const email = await this.settingsService.get('musicanet_email');
        const password = await this.settingsService.get('musicanet_password');
        if (email && password) return { email, password };
        return null;
    }

    /**
     * Enrich pieces using web sources (Phase 0 - before LLM)
     *
     * @param {Array} pieces - Array of piece objects with composer association
     * @param {Array} enrichmentFields - Fields to enrich (e.g. ['key', 'opus', 'voicing'])
     * @param {Function} [progressCallback] - Optional progress callback
     * @returns {Promise<Object>} { suggestions: [], webContext: Map, sourcesUsed: [] }
     */
    async enrichPieces(pieces, enrichmentFields, progressCallback = null) {
        const startTime = Date.now();
        const suggestions = [];
        const webContext = new Map(); // pieceId → { imslp: {...}, musicanet: {...} }
        const sourcesUsed = new Set();
        const errors = [];

        const imslpEnabled = await this.isSourceEnabled('imslp');
        const musicanetEnabled = await this.isSourceEnabled('musicanet');
        const musicanetCredentials = musicanetEnabled ? await this.getMusicaNetCredentials() : null;

        if (!imslpEnabled && !musicanetEnabled) {
            logger.info('[WebEnrichment] No web sources enabled, skipping');
            return { suggestions: [], webContext, sourcesUsed: [] };
        }

        logger.info('[WebEnrichment] Starting web enrichment', {
            pieceCount: pieces.length,
            fields: enrichmentFields,
            sources: { imslp: imslpEnabled, musicanet: musicanetEnabled }
        });

        for (let i = 0; i < pieces.length; i++) {
            const piece = pieces[i];
            const title = piece.title || piece.dataValues?.title;
            const composerName = piece.composer?.name || piece.composer?.dataValues?.name;
            const pieceId = piece.id || piece.dataValues?.id;
            const context = {};

            try {
                // Query IMSLP
                if (imslpEnabled && title) {
                    try {
                        const imslpData = await this.imslp.searchPiece(title, composerName);
                        if (imslpData) {
                            context.imslp = imslpData;
                            sourcesUsed.add('IMSLP');

                            // Generate suggestions from IMSLP data
                            const imslpSuggestions = this.generateSuggestionsFromIMSLP(
                                pieceId, imslpData, enrichmentFields, piece
                            );
                            suggestions.push(...imslpSuggestions);
                        }
                    } catch (err) {
                        logger.debug('[WebEnrichment] IMSLP error for piece:', {
                            pieceId, title, error: err.message
                        });
                        errors.push({ source: 'IMSLP', pieceId, error: err.message });
                    }
                }

                // Query Musica International
                if (musicanetEnabled && musicanetCredentials && title) {
                    try {
                        const musicaData = await this.musicanet.searchPiece(
                            title, composerName, musicanetCredentials
                        );
                        if (musicaData) {
                            context.musicanet = musicaData;
                            sourcesUsed.add('Musica International');

                            // Generate suggestions from Musica data
                            const musicaSuggestions = this.generateSuggestionsFromMusicaNet(
                                pieceId, musicaData, enrichmentFields, piece
                            );
                            suggestions.push(...musicaSuggestions);
                        }
                    } catch (err) {
                        logger.debug('[WebEnrichment] MusicaNet error for piece:', {
                            pieceId, title, error: err.message
                        });
                        errors.push({ source: 'Musica International', pieceId, error: err.message });
                    }
                }

                if (Object.keys(context).length > 0) {
                    webContext.set(pieceId, context);
                }

            } catch (err) {
                logger.warn('[WebEnrichment] Error enriching piece:', {
                    pieceId, title, error: err.message
                });
            }

            // Progress callback
            if (progressCallback) {
                await progressCallback({
                    processed: i + 1,
                    total: pieces.length,
                    phase: 'web-enrichment',
                    batchSuggestions: suggestions.length,
                    totalCostSoFar: 0 // web sources are free
                });
            }
        }

        const duration = Date.now() - startTime;
        logger.info('[WebEnrichment] Web enrichment completed', {
            duration: `${duration}ms`,
            suggestionsCount: suggestions.length,
            sourcesUsed: Array.from(sourcesUsed),
            piecesWithContext: webContext.size,
            errors: errors.length
        });

        return {
            suggestions: this.deduplicateSuggestions(suggestions),
            webContext,
            sourcesUsed: Array.from(sourcesUsed),
            errors,
            duration
        };
    }

    /**
     * Enrich composers using web sources
     */
    async enrichComposers(composers, enrichmentFields, progressCallback = null) {
        const suggestions = [];
        const sourcesUsed = new Set();
        const webContext = new Map();

        const imslpEnabled = await this.isSourceEnabled('imslp');

        if (!imslpEnabled) {
            return { suggestions: [], webContext, sourcesUsed: [] };
        }

        for (let i = 0; i < composers.length; i++) {
            const composer = composers[i];
            const name = composer.name || composer.dataValues?.name;
            const composerId = composer.id || composer.dataValues?.id;

            try {
                if (imslpEnabled && name) {
                    const imslpData = await this.imslp.searchComposer(name);
                    if (imslpData) {
                        webContext.set(composerId, { imslp: imslpData });
                        sourcesUsed.add('IMSLP');

                        const composerSuggestions = this.generateComposerSuggestions(
                            composerId, imslpData, enrichmentFields, composer
                        );
                        suggestions.push(...composerSuggestions);
                    }
                }
            } catch (err) {
                logger.debug('[WebEnrichment] Composer enrichment error:', {
                    composerId, name, error: err.message
                });
            }

            if (progressCallback) {
                await progressCallback({
                    processed: i + 1,
                    total: composers.length,
                    phase: 'web-enrichment'
                });
            }
        }

        return {
            suggestions: this.deduplicateSuggestions(suggestions),
            webContext,
            sourcesUsed: Array.from(sourcesUsed)
        };
    }

    // ───────────────────────── Suggestion generators ─────────────────────────

    /**
     * Generate enrichment suggestions from IMSLP data
     */
    generateSuggestionsFromIMSLP(pieceId, imslpData, enrichmentFields, piece) {
        const suggestions = [];

        const fieldMapping = {
            key: { value: imslpData.key, confidence: 0.92, reason: 'Tonart aus IMSLP-Werkseite' },
            opus: { value: imslpData.opus, confidence: 0.95, reason: 'Opus/Katalognummer aus IMSLP' },
            voicing: { value: imslpData.voicing || imslpData.instrumentation, confidence: 0.88, reason: 'Besetzung aus IMSLP-Werkseite' },
            durationSec: { value: imslpData.durationSec, confidence: 0.80, reason: 'Durchschnittsdauer aus IMSLP' },
            subtitle: { value: imslpData.alternativeTitle, confidence: 0.90, reason: 'Alternativtitel aus IMSLP' },
            lyricsSource: { value: imslpData.lyricsSource, confidence: 0.90, reason: 'Textquelle (Librettist) aus IMSLP' }
        };

        for (const field of enrichmentFields) {
            const mapping = fieldMapping[field];
            if (!mapping || !mapping.value) continue;

            // Skip if piece already has this field populated
            const currentValue = piece[field] || piece.dataValues?.[field];
            if (currentValue && currentValue !== '' && currentValue !== null) continue;

            suggestions.push({
                entityId: pieceId,
                pieceId: pieceId,
                fieldName: field,
                suggestedValue: String(mapping.value),
                confidence: mapping.confidence,
                source: 'IMSLP',
                reasoning: mapping.reason + (imslpData.imslpUrl ? ` (${imslpData.imslpUrl})` : ''),
                originalValue: currentValue || null
            });
        }

        return suggestions;
    }

    /**
     * Generate enrichment suggestions from Musica International data
     */
    generateSuggestionsFromMusicaNet(pieceId, musicaData, enrichmentFields, piece) {
        const suggestions = [];

        const fieldMapping = {
            voicing: { value: musicaData.voicing, confidence: 0.92, reason: 'Besetzung aus Musica International' },
            key: { value: musicaData.key, confidence: 0.90, reason: 'Tonart aus Musica International' },
            durationSec: { value: musicaData.durationSec, confidence: 0.85, reason: 'Dauer aus Musica International' },
            lyricsSource: { value: musicaData.lyricsSource, confidence: 0.92, reason: 'Textautor aus Musica International' },
            subtitle: { value: musicaData.genre, confidence: 0.85, reason: 'Genre/Untertitel aus Musica International' }
        };

        for (const field of enrichmentFields) {
            const mapping = fieldMapping[field];
            if (!mapping || !mapping.value) continue;

            const currentValue = piece[field] || piece.dataValues?.[field];
            if (currentValue && currentValue !== '' && currentValue !== null) continue;

            suggestions.push({
                entityId: pieceId,
                pieceId: pieceId,
                fieldName: field,
                suggestedValue: String(mapping.value),
                confidence: mapping.confidence,
                source: 'Musica International',
                reasoning: mapping.reason,
                originalValue: currentValue || null
            });
        }

        return suggestions;
    }

    /**
     * Generate composer enrichment suggestions
     */
    generateComposerSuggestions(composerId, webData, enrichmentFields, composer) {
        const suggestions = [];

        const fieldMapping = {
            birthYear: {
                value: webData.birthYear,
                confidence: 0.95,
                reason: 'Geburtsjahr aus ' + (webData.imslpUrl ? 'IMSLP' : 'Web-Quelle')
            },
            deathYear: {
                value: webData.deathYear,
                confidence: 0.95,
                reason: 'Todesjahr aus ' + (webData.imslpUrl ? 'IMSLP' : 'Web-Quelle')
            }
        };

        for (const field of enrichmentFields) {
            const mapping = fieldMapping[field];
            if (!mapping || !mapping.value) continue;

            const currentValue = composer[field] || composer.dataValues?.[field];
            if (currentValue && currentValue !== '' && currentValue !== null) continue;

            suggestions.push({
                entityId: composerId,
                pieceId: composerId,
                fieldName: field,
                suggestedValue: String(mapping.value),
                confidence: mapping.confidence,
                source: 'IMSLP',
                reasoning: mapping.reason + (webData.imslpUrl ? ` (${webData.imslpUrl})` : ''),
                originalValue: currentValue || null
            });
        }

        return suggestions;
    }

    // ───────────────────────── Helpers ─────────────────────────

    /**
     * Remove duplicate suggestions (same pieceId + fieldName), keeping highest confidence
     */
    deduplicateSuggestions(suggestions) {
        const map = new Map();

        for (const s of suggestions) {
            const key = `${s.entityId}:${s.fieldName}`;
            const existing = map.get(key);

            if (!existing || s.confidence > existing.confidence) {
                map.set(key, s);
            }
        }

        return Array.from(map.values());
    }

    /**
     * Build enrichment context string for LLM prompt enhancement.
     * Returns a compact text with web-sourced data to include in the LLM prompt.
     * Static so LLM providers can call it without an instance.
     * @param {Map} webContext - Map of pieceId → { imslp: {...}, musicanet: {...} }
     * @param {Array} batch - The current batch of pieces
     * @returns {string} Context text to prepend to the LLM prompt
     */
    static buildWebContextForPrompt(webContext, batch) {
        if (!webContext || webContext.size === 0) return '';

        const lines = [];
        for (let i = 0; i < batch.length; i++) {
            const piece = batch[i];
            const pieceId = piece.id || piece.dataValues?.id;
            const ctx = webContext.get(pieceId);
            if (!ctx) continue;

            const parts = [];
            if (ctx.imslp) {
                if (ctx.imslp.key) parts.push(`Key(IMSLP): ${ctx.imslp.key}`);
                if (ctx.imslp.opus) parts.push(`Opus(IMSLP): ${ctx.imslp.opus}`);
                if (ctx.imslp.voicing) parts.push(`Voicing(IMSLP): ${ctx.imslp.voicing}`);
                if (ctx.imslp.durationText) parts.push(`Duration(IMSLP): ${ctx.imslp.durationText}`);
                if (ctx.imslp.yearOfComposition) parts.push(`Year(IMSLP): ${ctx.imslp.yearOfComposition}`);
                if (ctx.imslp.language) parts.push(`Lang(IMSLP): ${ctx.imslp.language}`);
            }
            if (ctx.musicanet) {
                if (ctx.musicanet.voicing) parts.push(`Voicing(Musica): ${ctx.musicanet.voicing}`);
                if (ctx.musicanet.key) parts.push(`Key(Musica): ${ctx.musicanet.key}`);
                if (ctx.musicanet.language) parts.push(`Lang(Musica): ${ctx.musicanet.language}`);
                if (ctx.musicanet.lyricsSource) parts.push(`TextAuthor(Musica): ${ctx.musicanet.lyricsSource}`);
            }

            if (parts.length > 0) {
                lines.push(`  [${i}] WebData: ${parts.join(', ')}`);
            }
        }

        if (lines.length === 0) return '';

        return `\nVerified web data (use to validate & supplement your knowledge):\n${lines.join('\n')}\n`;
    }

    /**
     * Test all web source connections
     * @returns {Promise<Object>}
     */
    async testConnections() {
        const results = {};

        // Test IMSLP
        results.imslp = await this.imslp.testConnection();

        // Test Musica International
        const credentials = await this.getMusicaNetCredentials();
        results.musicanet = await this.musicanet.testConnection(credentials);

        return results;
    }
}

module.exports = WebEnrichmentProvider;
