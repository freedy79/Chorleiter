/**
 * Data Source Adapters
 * Fetch metadata from free public music databases
 */

const axios = require('axios');
const logger = require('../config/logger');

/**
 * IMSLP (International Music Score Library Project) Adapter
 * https://imslp.org - Free sheet music archive
 */
class IMSLPAdapter {
    constructor() {
        this.baseUrl = 'https://imslp.org/wiki/Special:SearchPagesForQuery';
        this.timeout = 10000;
    }

    /**
     * Search for piece on IMSLP
     * @param {Object} piece - Piece with title, composer
     * @returns {Promise<Object>}
     */
    async searchPiece(piece) {
        try {
            const query = `${piece.title} ${piece.composer?.name || ''}`.trim();

            const response = await axios.get(this.baseUrl, {
                params: {
                    q: query,
                    language: 'en'
                },
                timeout: this.timeout
            });

            // Parse results (IMSLP returns HTML)
            const enrichments = this.parseIMSLPResults(response.data, piece);

            return {
                source: 'IMSLP',
                enrichments,
                confidence: enrichments.length > 0 ? 0.7 : 0
            };
        } catch (error) {
            logger.warn('[IMSLPAdapter] Search error:', error.message);
            return { source: 'IMSLP', enrichments: [], confidence: 0 };
        }
    }

    /**
     * Parse IMSLP search results
     */
    parseIMSLPResults(html, piece) {
        const enrichments = [];

        // Basic parsing - in production would use proper HTML parser
        if (html.includes('Opus') || html.includes('opus')) {
            // Try to extract opus number pattern like "Op. 123"
            const opusMatch = html.match(/Op\.?\s*(\d+)/i);
            if (opusMatch) {
                enrichments.push({
                    fieldName: 'opus',
                    suggestedValue: `Op. ${opusMatch[1]}`,
                    source: 'IMSLP',
                    confidence: 0.8
                });
            }
        }

        return enrichments;
    }
}

/**
 * Wikidata Adapter
 * https://www.wikidata.org - Free knowledge base
 * Provides structured data about music and composers
 */
class WikidataAdapter {
    constructor() {
        this.baseUrl = 'https://www.wikidata.org/w/api.php';
        this.sparqlUrl = 'https://query.wikidata.org/sparql';
        this.timeout = 10000;
    }

    /**
     * Search for piece metadata on Wikidata
     * @param {Object} piece
     * @returns {Promise<Object>}
     */
    async searchPiece(piece) {
        try {
            // Search for composer first
            const composerData = await this.searchComposer(piece.composer?.name);

            if (!composerData.composerId) {
                return { source: 'Wikidata', enrichments: [], confidence: 0 };
            }

            // Query for compositions by this composer
            const compositions = await this.queryComposerCompositions(
                composerData.composerId,
                piece.title
            );

            const enrichments = this.extractPieceMetadata(compositions, piece);

            return {
                source: 'Wikidata',
                enrichments,
                confidence: enrichments.length > 0 ? 0.75 : 0
            };
        } catch (error) {
            logger.warn('[WikidataAdapter] Search error:', error.message);
            return { source: 'Wikidata', enrichments: [], confidence: 0 };
        }
    }

    /**
     * Search for composer on Wikidata
     */
    async searchComposer(composerName) {
        if (!composerName) return { composerId: null };

        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    action: 'wbsearchentities',
                    search: composerName,
                    type: 'item',
                    format: 'json',
                    language: 'en'
                },
                timeout: this.timeout
            });

            const results = response.data.search || [];
            if (results.length > 0) {
                return { composerId: results[0].id };
            }

            return { composerId: null };
        } catch (error) {
            logger.warn('[WikidataAdapter] Composer search error:', error.message);
            return { composerId: null };
        }
    }

    /**
     * Query Wikidata for compositions by composer
     */
    async queryComposerCompositions(composerId, pieceName) {
        try {
            const sparqlQuery = `
                SELECT ?composition ?compositionLabel ?opus ?key ?date WHERE {
                    ?composition wdt:P86 wd:${composerId} .
                    ?composition rdfs:label ?compositionLabel .
                    OPTIONAL { ?composition wdt:P86 ?opusNumber . }
                    OPTIONAL { ?composition wdt:P407 ?key . }
                    OPTIONAL { ?composition wdt:P577 ?date . }
                    FILTER (lang(?compositionLabel) = "en")
                    FILTER (CONTAINS(LCASE(?compositionLabel), LCASE("${pieceName.substring(0, 20)}")))
                }
                LIMIT 5
            `;

            const response = await axios.get(this.sparqlUrl, {
                params: {
                    query: sparqlQuery,
                    format: 'json'
                },
                timeout: this.timeout
            });

            return response.data.results?.bindings || [];
        } catch (error) {
            logger.warn('[WikidataAdapter] Composition query error:', error.message);
            return [];
        }
    }

    /**
     * Extract piece metadata from Wikidata results
     */
    extractPieceMetadata(results, piece) {
        const enrichments = [];

        if (results.length === 0) return enrichments;

        // Use first result
        const result = results[0];

        // Extract key if available
        if (result.key) {
            enrichments.push({
                fieldName: 'key',
                suggestedValue: result.key.value,
                source: 'Wikidata',
                confidence: 0.7
            });
        }

        // Extract date/composition year
        if (result.date) {
            enrichments.push({
                fieldName: 'composedYear',
                suggestedValue: result.date.value,
                source: 'Wikidata',
                confidence: 0.75
            });
        }

        return enrichments;
    }
}

/**
 * MusicBrainz Adapter
 * https://musicbrainz.org - Open music database
 * Provides detailed information about recordings, releases, and works
 */
class MusicBrainzAdapter {
    constructor() {
        this.baseUrl = 'https://musicbrainz.org/ws/2';
        this.timeout = 10000;
        // MusicBrainz requires User-Agent
        this.userAgent = 'ChorleiterApp/1.0 (data-enrichment-agent)';
    }

    /**
     * Search for work on MusicBrainz
     * @param {Object} piece
     * @returns {Promise<Object>}
     */
    async searchPiece(piece) {
        try {
            const query = `title:"${piece.title}"`;
            const queryStr = piece.composer?.name
                ? `${query} AND artist:"${piece.composer.name}"`
                : query;

            const response = await axios.get(`${this.baseUrl}/work`, {
                params: {
                    query: queryStr,
                    fmt: 'json',
                    limit: 5
                },
                headers: {
                    'User-Agent': this.userAgent
                },
                timeout: this.timeout
            });

            const works = response.data.works || [];
            const enrichments = this.extractWorkMetadata(works, piece);

            return {
                source: 'MusicBrainz',
                enrichments,
                confidence: enrichments.length > 0 ? 0.8 : 0
            };
        } catch (error) {
            logger.warn('[MusicBrainzAdapter] Search error:', error.message);
            return { source: 'MusicBrainz', enrichments: [], confidence: 0 };
        }
    }

    /**
     * Extract work metadata from MusicBrainz
     */
    extractWorkMetadata(works, piece) {
        const enrichments = [];

        if (works.length === 0) return enrichments;

        const work = works[0];

        // Extract opus
        if (work.attributes?.opus) {
            enrichments.push({
                fieldName: 'opus',
                suggestedValue: `Op. ${work.attributes.opus}`,
                source: 'MusicBrainz',
                confidence: 0.85
            });
        }

        // Extract key
        if (work.attributes?.key) {
            enrichments.push({
                fieldName: 'key',
                suggestedValue: work.attributes.key,
                source: 'MusicBrainz',
                confidence: 0.80
            });
        }

        // Extract first performance or composition date
        if (work['first-release-date']) {
            const year = work['first-release-date'].split('-')[0];
            enrichments.push({
                fieldName: 'composedYear',
                suggestedValue: year,
                source: 'MusicBrainz',
                confidence: 0.75
            });
        }

        return enrichments;
    }
}

/**
 * Composite Data Source Manager
 * Queries multiple sources and merges results
 */
class DataSourceManager {
    constructor() {
        this.adapters = {
            imslp: new IMSLPAdapter(),
            wikidata: new WikidataAdapter(),
            musicbrainz: new MusicBrainzAdapter()
        };
    }

    /**
     * Search all data sources for piece enrichment
     * @param {Object} piece
     * @returns {Promise<Array>}
     */
    async searchAllSources(piece) {
        const allResults = [];

        // Query all sources in parallel
        const results = await Promise.allSettled([
            this.adapters.imslp.searchPiece(piece),
            this.adapters.wikidata.searchPiece(piece),
            this.adapters.musicbrainz.searchPiece(piece)
        ]);

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.enrichments) {
                allResults.push(...result.value.enrichments);
            }
        }

        // Merge and deduplicate
        return this.mergeResults(allResults);
    }

    /**
     * Merge results from multiple sources
     * Prefer higher confidence scores
     */
    mergeResults(enrichments) {
        const merged = new Map();

        enrichments.forEach(e => {
            const key = e.fieldName;
            const existing = merged.get(key);

            // Always take highest confidence
            if (!existing || e.confidence > existing.confidence) {
                merged.set(key, e);
            }
        });

        return Array.from(merged.values());
    }
}

module.exports = {
    IMSLPAdapter,
    WikidataAdapter,
    MusicBrainzAdapter,
    DataSourceManager
};
