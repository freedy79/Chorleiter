/**
 * IMSLP (International Music Score Library Project) Scraper Service
 * Searches the IMSLP MediaWiki API for music metadata:
 *   - Key, Opus/Catalogue Number, Voicing/Instrumentation
 *   - Duration, Year of Composition, Language, Piece Style
 *
 * Uses two API endpoints:
 *   1. Search: api.php?action=query&list=search  (find pages by title+composer)
 *   2. Parse:  api.php?action=parse&prop=wikitext (extract structured template data)
 *
 * No authentication required – IMSLP's API is public.
 */

const axios = require('axios');
const logger = require('../../config/logger');

const BASE_URL = 'https://imslp.org/api.php';
const REQUEST_DELAY_MS = 1200; // polite rate-limiting: ≤1 req/sec

class IMSLPScraper {
    constructor() {
        this.lastRequestTime = 0;
    }

    // ───────────────────────── public API ─────────────────────────

    /**
     * Search IMSLP for a piece and return structured metadata.
     * @param {string} title  – piece title (e.g. "Mass in B minor")
     * @param {string} [composerName] – composer full name (e.g. "Johann Sebastian Bach")
     * @returns {Promise<Object|null>} parsed metadata or null
     */
    async searchPiece(title, composerName) {
        try {
            if (!title) return null;

            const searchQuery = composerName
                ? `${title} ${this.normalizeComposerForSearch(composerName)}`
                : title;

            const pages = await this.search(searchQuery);
            if (!pages || pages.length === 0) return null;

            // Find best match among top results
            const bestPage = this.pickBestMatch(pages, title, composerName);
            if (!bestPage) return null;

            const wikitext = await this.getPageWikitext(bestPage.title);
            if (!wikitext) return null;

            const metadata = this.parseWorkInfo(wikitext);
            metadata.imslpPage = bestPage.title;
            metadata.imslpUrl = `https://imslp.org/wiki/${encodeURIComponent(bestPage.title.replace(/ /g, '_'))}`;

            return metadata;
        } catch (error) {
            logger.warn('[IMSLPScraper] searchPiece error:', { title, composerName, error: error.message });
            return null;
        }
    }

    /**
     * Search IMSLP for a composer and return basic biographical data.
     * @param {string} composerName
     * @returns {Promise<Object|null>}
     */
    async searchComposer(composerName) {
        try {
            if (!composerName) return null;

            // IMSLP composer pages follow pattern: "Category:LastName, FirstName"
            const pages = await this.search(composerName);
            if (!pages || pages.length === 0) return null;

            // Look for the composer page (contains birth/death in title usually)
            const composerPage = pages.find(p =>
                p.title.toLowerCase().includes(this.getLastName(composerName).toLowerCase())
            );

            if (!composerPage) return null;

            const wikitext = await this.getPageWikitext(composerPage.title);
            if (!wikitext) return null;

            return {
                imslpPage: composerPage.title,
                imslpUrl: `https://imslp.org/wiki/${encodeURIComponent(composerPage.title.replace(/ /g, '_'))}`,
                ...this.parseComposerInfo(wikitext)
            };
        } catch (error) {
            logger.warn('[IMSLPScraper] searchComposer error:', { composerName, error: error.message });
            return null;
        }
    }

    // ───────────────────────── MediaWiki API calls ─────────────────────────

    /**
     * Search IMSLP via MediaWiki search API
     * @param {string} query
     * @param {number} [limit=5]
     * @returns {Promise<Array>}
     */
    async search(query, limit = 5) {
        await this.rateLimit();

        const response = await axios.get(BASE_URL, {
            params: {
                action: 'query',
                list: 'search',
                srsearch: query,
                format: 'json',
                srlimit: limit
            },
            timeout: 15000,
            headers: { 'User-Agent': 'Chorleiter/1.0 (choir management app)' }
        });

        return response.data?.query?.search || [];
    }

    /**
     * Fetch wikitext for a specific page (section 0 = header/template)
     * @param {string} pageTitle
     * @returns {Promise<string|null>}
     */
    async getPageWikitext(pageTitle) {
        await this.rateLimit();

        const response = await axios.get(BASE_URL, {
            params: {
                action: 'parse',
                page: pageTitle,
                prop: 'wikitext',
                format: 'json',
                section: 0
            },
            timeout: 15000,
            headers: { 'User-Agent': 'Chorleiter/1.0 (choir management app)' }
        });

        return response.data?.parse?.wikitext?.['*'] || null;
    }

    // ───────────────────────── Wikitext Parsers ─────────────────────────

    /**
     * Parse *****WORK INFO***** section fields from IMSLP wikitext template.
     * @param {string} wikitext
     * @returns {Object}
     */
    parseWorkInfo(wikitext) {
        const result = {};

        // Extract key (e.g. {{Key|b}} → "b minor", {{K|C}} → "C major")
        const keyMatch = wikitext.match(/\|Key=\{\{Key\|([^}]+)\}\}/i)
            || wikitext.match(/\|Key=([^\n|]+)/i);
        if (keyMatch) {
            result.key = this.normalizeKey(keyMatch[1].trim());
        }

        // Opus / Catalogue Number
        const opusMatch = wikitext.match(/\|Opus\/Catalogue Number=([^\n|]+)/i);
        if (opusMatch) {
            result.opus = this.cleanWikiMarkup(opusMatch[1].trim());
        }

        // Work Title
        const titleMatch = wikitext.match(/\|Work Title=([^\n|]+)/i);
        if (titleMatch) {
            result.workTitle = this.cleanWikiMarkup(titleMatch[1].trim());
        }

        // Alternative Title
        const altTitleMatch = wikitext.match(/\|Alternative Title=([^\n|]+)/i);
        if (altTitleMatch) {
            const alt = this.cleanWikiMarkup(altTitleMatch[1].trim());
            if (alt) result.alternativeTitle = alt;
        }

        // Average Duration (minutes or "Xm Ys")
        const durationMatch = wikitext.match(/\|Average Duration=([^\n|]+)/i);
        if (durationMatch) {
            result.durationText = this.cleanWikiMarkup(durationMatch[1].trim());
            const seconds = this.parseDurationToSeconds(result.durationText);
            if (seconds) result.durationSec = seconds;
        }

        // Year/Date of Composition
        const yearMatch = wikitext.match(/\|Year\/Date of Composition=([^\n|]+)/i);
        if (yearMatch) {
            result.yearOfComposition = this.cleanWikiMarkup(yearMatch[1].trim());
        }

        // Language
        const langMatch = wikitext.match(/\|Language=([^\n|]+)/i);
        if (langMatch) {
            const lang = this.cleanWikiMarkup(langMatch[1].trim());
            if (lang) result.language = lang;
        }

        // Piece Style
        const styleMatch = wikitext.match(/\|Piece Style=([^\n|]+)/i);
        if (styleMatch) {
            result.pieceStyle = this.cleanWikiMarkup(styleMatch[1].trim());
        }

        // Instrumentation (short)
        const instrMatch = wikitext.match(/\|Instrumentation=([^\n|]+)/i);
        if (instrMatch) {
            result.instrumentation = this.cleanWikiMarkup(instrMatch[1].trim());
        }

        // InstrDetail (detailed voicing)
        const instrDetailMatch = wikitext.match(/\|InstrDetail=([^\n|]+)/i);
        if (instrDetailMatch) {
            result.voicing = this.cleanWikiMarkup(instrDetailMatch[1].trim());
        }

        // Number of Movements
        const movementsMatch = wikitext.match(/\|Movements Header=([^\n|]+)/i);
        if (movementsMatch) {
            result.movementsHeader = this.cleanWikiMarkup(movementsMatch[1].trim());
        }

        // Librettist / Text source
        const librettistMatch = wikitext.match(/\|Librettist=([^\n|]+)/i);
        if (librettistMatch) {
            const lib = this.cleanWikiMarkup(librettistMatch[1].trim());
            if (lib) result.lyricsSource = lib;
        }

        // First Publication
        const pubMatch = wikitext.match(/\|Year of First Publication=([^\n|]+)/i);
        if (pubMatch) {
            result.firstPublication = this.cleanWikiMarkup(pubMatch[1].trim());
        }

        return result;
    }

    /**
     * Parse composer info from wikitext (lives on composer category pages).
     * Extracts birth/death years from the page text.
     * @param {string} wikitext
     * @returns {Object}
     */
    parseComposerInfo(wikitext) {
        const result = {};

        // Birth year
        const birthMatch = wikitext.match(/\|Born=(\d{4})/i)
            || wikitext.match(/born[:\s]*(\d{4})/i)
            || wikitext.match(/\((\d{4})\s*[-–]/);
        if (birthMatch) {
            result.birthYear = parseInt(birthMatch[1], 10);
        }

        // Death year
        const deathMatch = wikitext.match(/\|Died=(\d{4})/i)
            || wikitext.match(/died[:\s]*(\d{4})/i)
            || wikitext.match(/[-–]\s*(\d{4})\)/);
        if (deathMatch) {
            result.deathYear = parseInt(deathMatch[1], 10);
        }

        return result;
    }

    // ───────────────────────── Helpers ─────────────────────────

    /**
     * Rate limiter: ensures at least REQUEST_DELAY_MS between API calls
     */
    async rateLimit() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < REQUEST_DELAY_MS) {
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
        }
        this.lastRequestTime = Date.now();
    }

    /**
     * Pick the best-matching page from search results
     */
    pickBestMatch(pages, title, composerName) {
        const titleLower = title.toLowerCase().trim();
        const composerLower = (composerName || '').toLowerCase().trim();
        const lastName = this.getLastName(composerName).toLowerCase();

        // Score each page
        let best = null;
        let bestScore = -1;

        for (const page of pages) {
            const pageLower = page.title.toLowerCase();
            let score = 0;

            // Title match
            if (pageLower.includes(titleLower)) score += 10;
            else {
                // Partial word overlap
                const titleWords = titleLower.split(/\s+/);
                const matchedWords = titleWords.filter(w => w.length > 2 && pageLower.includes(w));
                score += matchedWords.length * 2;
            }

            // Composer match
            if (composerLower && pageLower.includes(lastName)) score += 5;

            // IMSLP work pages have format "Title (Composer, FirstName)" - prefer these
            if (pageLower.includes('(') && pageLower.includes(')')) score += 2;

            // Avoid redirect pages (typically very short snippetLength)
            if (page.size && page.size < 200) score -= 3;

            if (score > bestScore) {
                bestScore = score;
                best = page;
            }
        }

        return bestScore >= 3 ? best : pages[0]; // Fallback to first result
    }

    /**
     * Extract last name from a full name string
     */
    getLastName(name) {
        if (!name) return '';
        const parts = name.trim().split(/\s+/);
        return parts[parts.length - 1];
    }

    /**
     * Normalize composer name for IMSLP search
     * IMSLP uses "LastName, FirstName" format
     */
    normalizeComposerForSearch(composerName) {
        if (!composerName) return '';
        // Just use the name as-is – IMSLP search is flexible
        return composerName;
    }

    /**
     * Normalize key notation from IMSLP format
     * {{Key|b}} → "h-Moll", {{Key|C}} → "C-Dur", etc.
     */
    normalizeKey(raw) {
        // Remove wiki markup
        const cleaned = raw.replace(/\{\{Key\|/gi, '').replace(/\}\}/g, '').trim();

        // IMSLP uses English key notation; map to German (common in choir context)
        const keyMap = {
            'C': 'C-Dur', 'c': 'c-Moll',
            'D': 'D-Dur', 'd': 'd-Moll',
            'E': 'E-Dur', 'e': 'e-Moll',
            'F': 'F-Dur', 'f': 'f-Moll',
            'G': 'G-Dur', 'g': 'g-Moll',
            'A': 'A-Dur', 'a': 'a-Moll',
            'B': 'B-Dur', 'b': 'h-Moll',            // IMSLP "b" = German "h"
            'Bb': 'B-Dur', 'bb': 'b-Moll',
            'Db': 'Des-Dur', 'db': 'des-Moll',
            'Eb': 'Es-Dur', 'eb': 'es-Moll',
            'F#': 'Fis-Dur', 'f#': 'fis-Moll',
            'Ab': 'As-Dur', 'ab': 'as-Moll',
            'C#': 'Cis-Dur', 'c#': 'cis-Moll',
            'G#': 'Gis-Dur', 'g#': 'gis-Moll'
        };

        return keyMap[cleaned] || cleaned;
    }

    /**
     * Parse duration text into seconds
     * Handles: "135 minutes", "5'30\"", "3 min", "~4 minutes", etc.
     */
    parseDurationToSeconds(text) {
        if (!text) return null;

        // "X minutes" or "~X minutes"
        const minutesMatch = text.match(/~?(\d+)\s*(?:minutes?|min)/i);
        if (minutesMatch) {
            return parseInt(minutesMatch[1], 10) * 60;
        }

        // "X'Y\"" format
        const primeMatch = text.match(/(\d+)[''′]\s*(\d+)?[""″]?/);
        if (primeMatch) {
            const minutes = parseInt(primeMatch[1], 10);
            const seconds = primeMatch[2] ? parseInt(primeMatch[2], 10) : 0;
            return minutes * 60 + seconds;
        }

        // Plain number (assume minutes)
        const plainMatch = text.match(/^~?(\d+)$/);
        if (plainMatch) {
            return parseInt(plainMatch[1], 10) * 60;
        }

        return null;
    }

    /**
     * Strip wiki markup from a string
     */
    cleanWikiMarkup(text) {
        if (!text) return '';
        return text
            .replace(/\{\{[^}]*\}\}/g, '')          // Remove {{ templates }}
            .replace(/\[\[([^|\]]*\|)?([^\]]*)\]\]/g, '$2') // [[link|text]] → text
            .replace(/<br\s*\/?>/gi, ', ')           // <br> → comma
            .replace(/<[^>]+>/g, '')                 // Remove HTML tags
            .replace(/\s+/g, ' ')                    // Collapse whitespace
            .replace(/^[,;\s]+|[,;\s]+$/g, '')       // Trim punctuation
            .trim();
    }

    /**
     * Test if the scraper can reach IMSLP
     * @returns {Promise<{ok: boolean, message: string}>}
     */
    async testConnection() {
        try {
            const results = await this.search('Bach', 1);
            if (results && results.length > 0) {
                return { ok: true, message: 'IMSLP-Verbindung erfolgreich' };
            }
            return { ok: false, message: 'IMSLP erreichbar, aber keine Ergebnisse' };
        } catch (error) {
            return { ok: false, message: `IMSLP nicht erreichbar: ${error.message}` };
        }
    }
}

module.exports = IMSLPScraper;
