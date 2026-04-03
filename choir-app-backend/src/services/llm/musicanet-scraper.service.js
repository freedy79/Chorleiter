/**
 * Musica International (musicanet.org) Scraper Service
 * Searches the Musica International choral database for metadata:
 *   - Voicing, Language, Duration, Publisher, Lyrics source
 *
 * Musica International requires authentication to access its database.
 * Credentials are stored encrypted in data_enrichment_settings.
 *
 * The scraper uses their search form endpoint to query pieces and
 * parses the HTML result pages with cheerio.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../config/logger');

const BASE_URL = 'https://www.musicanet.org';
const SEARCH_URL = `${BASE_URL}/bdd/en/search`;
const LOGIN_URL = `${BASE_URL}/en/login/`;
const REQUEST_DELAY_MS = 2000; // polite rate-limiting

class MusicaNetScraper {
    constructor() {
        this.lastRequestTime = 0;
        this.sessionCookies = null;
        this.isLoggedIn = false;
    }

    // ───────────────────────── public API ─────────────────────────

    /**
     * Search Musica International for a piece and return structured metadata.
     * @param {string} title – piece title
     * @param {string} [composerName] – composer name
     * @param {Object} [credentials] – { email, password } for login
     * @returns {Promise<Object|null>} parsed metadata or null
     */
    async searchPiece(title, composerName, credentials) {
        try {
            if (!title) return null;

            // Ensure we're logged in
            if (!this.isLoggedIn && credentials) {
                await this.login(credentials.email, credentials.password);
            }

            if (!this.isLoggedIn) {
                logger.warn('[MusicaNetScraper] Not logged in – cannot search');
                return null;
            }

            // Perform search
            const searchResults = await this.searchScores(title, composerName);
            if (!searchResults || searchResults.length === 0) return null;

            // Pick the best match
            const bestResult = this.pickBestMatch(searchResults, title, composerName);
            if (!bestResult) return null;

            // If the result already has detail, return it; otherwise fetch detail page
            if (bestResult.detailUrl) {
                const detail = await this.fetchDetailPage(bestResult.detailUrl);
                return { ...bestResult, ...detail };
            }

            return bestResult;
        } catch (error) {
            logger.warn('[MusicaNetScraper] searchPiece error:', {
                title, composerName, error: error.message
            });
            return null;
        }
    }

    /**
     * Search Musica International for a composer.
     * @param {string} composerName
     * @param {Object} [credentials]
     * @returns {Promise<Object|null>}
     */
    async searchComposer(composerName, credentials) {
        try {
            if (!composerName) return null;

            if (!this.isLoggedIn && credentials) {
                await this.login(credentials.email, credentials.password);
            }

            if (!this.isLoggedIn) {
                logger.warn('[MusicaNetScraper] Not logged in – cannot search');
                return null;
            }

            const results = await this.searchComposers(composerName);
            if (!results || results.length === 0) return null;

            return results[0]; // Return first/best match
        } catch (error) {
            logger.warn('[MusicaNetScraper] searchComposer error:', {
                composerName, error: error.message
            });
            return null;
        }
    }

    // ───────────────────────── Authentication ─────────────────────────

    /**
     * Login to Musica International.
     * Stores session cookies for subsequent requests.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<boolean>}
     */
    async login(email, password) {
        try {
            if (!email || !password) {
                logger.warn('[MusicaNetScraper] Missing credentials for login');
                return false;
            }

            await this.rateLimit();

            // First, get the login page to capture CSRF token and cookies
            const loginPageResponse = await axios.get(LOGIN_URL, {
                timeout: 15000,
                headers: this.getHeaders(),
                maxRedirects: 5,
                validateStatus: (status) => status < 400
            });

            // Extract cookies from response
            const setCookies = loginPageResponse.headers['set-cookie'] || [];
            this.sessionCookies = this.parseCookies(setCookies);

            // Extract CSRF token if present (WordPress commonly uses _wpnonce)
            const loginHtml = loginPageResponse.data;
            const $ = cheerio.load(loginHtml);
            const csrfToken = $('input[name="_wpnonce"]').val()
                || $('input[name="csrf_token"]').val()
                || '';

            await this.rateLimit();

            // Submit login form
            const formData = new URLSearchParams();
            formData.append('log', email);
            formData.append('pwd', password);
            formData.append('wp-submit', 'Log In');
            formData.append('redirect_to', `${BASE_URL}/bdd/en/`);
            if (csrfToken) {
                formData.append('_wpnonce', csrfToken);
            }

            const loginResponse = await axios.post(LOGIN_URL, formData.toString(), {
                timeout: 15000,
                headers: {
                    ...this.getHeaders(),
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': this.getCookieString()
                },
                maxRedirects: 0,
                validateStatus: (status) => status < 500
            });

            // Merge new cookies
            const newCookies = loginResponse.headers['set-cookie'] || [];
            this.sessionCookies = { ...this.sessionCookies, ...this.parseCookies(newCookies) };

            // Check if login was successful (redirect to dashboard or presence of session cookie)
            const hasSessionCookie = Object.keys(this.sessionCookies).some(
                key => key.startsWith('wordpress_logged_in')
            );
            const isRedirect = loginResponse.status === 302 || loginResponse.status === 301;

            this.isLoggedIn = hasSessionCookie || isRedirect;

            if (this.isLoggedIn) {
                logger.info('[MusicaNetScraper] Login successful');
            } else {
                logger.warn('[MusicaNetScraper] Login may have failed – no session cookie detected');
            }

            return this.isLoggedIn;
        } catch (error) {
            logger.error('[MusicaNetScraper] Login error:', error.message);
            this.isLoggedIn = false;
            return false;
        }
    }

    /**
     * Logout / clear session
     */
    logout() {
        this.sessionCookies = null;
        this.isLoggedIn = false;
    }

    // ───────────────────────── Search endpoints ─────────────────────────

    /**
     * Search scores (pieces) in the Musica database
     * @param {string} title
     * @param {string} [composerName]
     * @returns {Promise<Array>}
     */
    async searchScores(title, composerName) {
        await this.rateLimit();

        try {
            // Musica uses form-based search; we replicate the POST request
            const formData = new URLSearchParams();
            formData.append('titre', title);
            if (composerName) {
                formData.append('compositeur', composerName);
            }
            formData.append('type_recherche', 'partitions'); // scores

            const response = await axios.post(SEARCH_URL, formData.toString(), {
                timeout: 20000,
                headers: {
                    ...this.getHeaders(),
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': this.getCookieString()
                },
                maxRedirects: 5,
                validateStatus: (status) => status < 500
            });

            return this.parseSearchResults(response.data);
        } catch (error) {
            logger.warn('[MusicaNetScraper] searchScores error:', error.message);
            return [];
        }
    }

    /**
     * Search composers in the Musica database
     * @param {string} composerName
     * @returns {Promise<Array>}
     */
    async searchComposers(composerName) {
        await this.rateLimit();

        try {
            const formData = new URLSearchParams();
            formData.append('compositeur', composerName);
            formData.append('type_recherche', 'compositeurs');

            const response = await axios.post(SEARCH_URL, formData.toString(), {
                timeout: 20000,
                headers: {
                    ...this.getHeaders(),
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': this.getCookieString()
                },
                maxRedirects: 5,
                validateStatus: (status) => status < 500
            });

            return this.parseComposerResults(response.data);
        } catch (error) {
            logger.warn('[MusicaNetScraper] searchComposers error:', error.message);
            return [];
        }
    }

    /**
     * Fetch a detail page for a specific score
     * @param {string} url - Full or relative URL
     * @returns {Promise<Object>}
     */
    async fetchDetailPage(url) {
        await this.rateLimit();

        try {
            const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

            const response = await axios.get(fullUrl, {
                timeout: 15000,
                headers: {
                    ...this.getHeaders(),
                    'Cookie': this.getCookieString()
                },
                maxRedirects: 5,
                validateStatus: (status) => status < 500
            });

            return this.parseDetailPage(response.data);
        } catch (error) {
            logger.warn('[MusicaNetScraper] fetchDetailPage error:', error.message);
            return {};
        }
    }

    // ───────────────────────── HTML Parsers ─────────────────────────

    /**
     * Parse search results HTML page into structured data.
     * Adapts to Musica International's table-based result format.
     * @param {string} html
     * @returns {Array<Object>}
     */
    parseSearchResults(html) {
        const results = [];
        try {
            const $ = cheerio.load(html);

            // Musica typically shows results in a table or list
            // Look for common result containers
            $('table.results tr, .result-row, .partition-item, .search-result-item').each((i, el) => {
                const $row = $(el);
                const result = {};

                // Extract title
                const titleLink = $row.find('a[href*="/partition/"], a[href*="/score/"], a.title-link').first();
                if (titleLink.length) {
                    result.title = titleLink.text().trim();
                    result.detailUrl = titleLink.attr('href');
                }

                // Extract composer
                const composerEl = $row.find('.compositeur, .composer, td:nth-child(2)');
                if (composerEl.length) {
                    result.composer = composerEl.text().trim();
                }

                // Extract voicing
                const voicingEl = $row.find('.formation, .voicing, td:nth-child(3)');
                if (voicingEl.length) {
                    result.voicing = voicingEl.text().trim();
                }

                // Extract publisher
                const publisherEl = $row.find('.editeur, .publisher, td:nth-child(4)');
                if (publisherEl.length) {
                    result.publisher = publisherEl.text().trim();
                }

                if (result.title) {
                    result.source = 'Musica International';
                    results.push(result);
                }
            });

            // Fallback: try generic link-based extraction
            if (results.length === 0) {
                $('a[href*="/partition/"], a[href*="/score/"]').each((i, el) => {
                    const $link = $(el);
                    results.push({
                        title: $link.text().trim(),
                        detailUrl: $link.attr('href'),
                        source: 'Musica International'
                    });
                });
            }

            logger.debug(`[MusicaNetScraper] Parsed ${results.length} search results`);
        } catch (error) {
            logger.warn('[MusicaNetScraper] Error parsing search results:', error.message);
        }
        return results;
    }

    /**
     * Parse composer search results
     * @param {string} html
     * @returns {Array<Object>}
     */
    parseComposerResults(html) {
        const results = [];
        try {
            const $ = cheerio.load(html);

            $('table.results tr, .result-row, .composer-item').each((i, el) => {
                const $row = $(el);
                const result = {};

                const nameLink = $row.find('a[href*="/compositeur/"], a[href*="/composer/"]').first();
                if (nameLink.length) {
                    result.name = nameLink.text().trim();
                    result.detailUrl = nameLink.attr('href');
                }

                // Extract dates
                const datesEl = $row.find('.dates, td:nth-child(2)');
                if (datesEl.length) {
                    const datesText = datesEl.text().trim();
                    const birthMatch = datesText.match(/(\d{4})\s*[-–]/);
                    const deathMatch = datesText.match(/[-–]\s*(\d{4})/);
                    if (birthMatch) result.birthYear = parseInt(birthMatch[1], 10);
                    if (deathMatch) result.deathYear = parseInt(deathMatch[1], 10);
                }

                if (result.name) {
                    result.source = 'Musica International';
                    results.push(result);
                }
            });
        } catch (error) {
            logger.warn('[MusicaNetScraper] Error parsing composer results:', error.message);
        }
        return results;
    }

    /**
     * Parse a detail page for a specific score
     * @param {string} html
     * @returns {Object}
     */
    parseDetailPage(html) {
        const result = {};
        try {
            const $ = cheerio.load(html);

            // Common field selectors on Musica detail pages
            const fieldMap = {
                'Titre': 'title',
                'Title': 'title',
                'Compositeur': 'composer',
                'Composer': 'composer',
                'Formation': 'voicing',
                'Voicing': 'voicing',
                'Tonalité': 'key',
                'Key': 'key',
                'Durée': 'durationText',
                'Duration': 'durationText',
                'Éditeur': 'publisher',
                'Publisher': 'publisher',
                'Langue': 'language',
                'Language': 'language',
                'Auteur du texte': 'lyricsSource',
                'Author of text': 'lyricsSource',
                'Genre': 'genre',
                'Époque': 'period',
                'Period': 'period',
                'Nombre de voix': 'numberOfVoices',
                'Number of voices': 'numberOfVoices',
                'Accompagnement': 'accompaniment',
                'Accompaniment': 'accompaniment'
            };

            // Try table-based detail layout (label: value)
            $('tr, .detail-field, .field-row').each((i, el) => {
                const $row = $(el);
                const label = $row.find('th, .field-label, td:first-child').text().trim();
                const value = $row.find('td:last-child, .field-value').text().trim();

                for (const [keyword, fieldName] of Object.entries(fieldMap)) {
                    if (label.includes(keyword)) {
                        result[fieldName] = value;
                        break;
                    }
                }
            });

            // Try definition-list layout (dt/dd)
            $('dl').each((i, el) => {
                const $dl = $(el);
                $dl.find('dt').each((j, dt) => {
                    const label = $(dt).text().trim();
                    const value = $(dt).next('dd').text().trim();

                    for (const [keyword, fieldName] of Object.entries(fieldMap)) {
                        if (label.includes(keyword)) {
                            result[fieldName] = value;
                            break;
                        }
                    }
                });
            });

            // Parse duration text to seconds
            if (result.durationText) {
                const seconds = this.parseDurationToSeconds(result.durationText);
                if (seconds) result.durationSec = seconds;
            }

            result.source = 'Musica International';
        } catch (error) {
            logger.warn('[MusicaNetScraper] Error parsing detail page:', error.message);
        }
        return result;
    }

    // ───────────────────────── Helpers ─────────────────────────

    /**
     * Pick the best matching result from the search list
     */
    pickBestMatch(results, title, composerName) {
        const titleLower = (title || '').toLowerCase().trim();
        const composerLower = (composerName || '').toLowerCase().trim();

        let best = null;
        let bestScore = -1;

        for (const result of results) {
            const resultTitle = (result.title || '').toLowerCase();
            const resultComposer = (result.composer || '').toLowerCase();
            let score = 0;

            // Title similarity
            if (resultTitle.includes(titleLower) || titleLower.includes(resultTitle)) {
                score += 10;
            } else {
                const words = titleLower.split(/\s+/);
                const matched = words.filter(w => w.length > 2 && resultTitle.includes(w));
                score += matched.length * 2;
            }

            // Composer match
            if (composerLower && resultComposer.includes(composerLower.split(/\s+/).pop())) {
                score += 5;
            }

            if (score > bestScore) {
                bestScore = score;
                best = result;
            }
        }

        return bestScore >= 3 ? best : (results[0] || null);
    }

    /**
     * Parse duration text into seconds
     */
    parseDurationToSeconds(text) {
        if (!text) return null;

        const minutesMatch = text.match(/(\d+)\s*(?:minutes?|min|mn)/i);
        if (minutesMatch) {
            return parseInt(minutesMatch[1], 10) * 60;
        }

        const primeMatch = text.match(/(\d+)[''′]\s*(\d+)?[""″]?/);
        if (primeMatch) {
            const minutes = parseInt(primeMatch[1], 10);
            const seconds = primeMatch[2] ? parseInt(primeMatch[2], 10) : 0;
            return minutes * 60 + seconds;
        }

        const mmssMatch = text.match(/(\d+):(\d{2})/);
        if (mmssMatch) {
            return parseInt(mmssMatch[1], 10) * 60 + parseInt(mmssMatch[2], 10);
        }

        return null;
    }

    /**
     * Rate limiter
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
     * Parse Set-Cookie headers into a cookie object
     */
    parseCookies(setCookieHeaders) {
        const cookies = {};
        for (const header of setCookieHeaders) {
            const parts = header.split(';')[0];
            const [name, ...valueParts] = parts.split('=');
            cookies[name.trim()] = valueParts.join('=').trim();
        }
        return cookies;
    }

    /**
     * Get cookie string for requests
     */
    getCookieString() {
        if (!this.sessionCookies) return '';
        return Object.entries(this.sessionCookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
    }

    /**
     * Default request headers
     */
    getHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,de;q=0.8,fr;q=0.7'
        };
    }

    /**
     * Test if the scraper can connect (and optionally login)
     * @param {Object} [credentials] – { email, password }
     * @returns {Promise<{ok: boolean, message: string}>}
     */
    async testConnection(credentials) {
        try {
            // Test basic reachability
            await this.rateLimit();
            const response = await axios.get(BASE_URL, {
                timeout: 10000,
                headers: this.getHeaders()
            });

            if (response.status !== 200) {
                return { ok: false, message: `Musica International nicht erreichbar (HTTP ${response.status})` };
            }

            // Test login if credentials provided
            if (credentials && credentials.email && credentials.password) {
                const loginOk = await this.login(credentials.email, credentials.password);
                if (loginOk) {
                    return { ok: true, message: 'Musica International: Verbindung und Login erfolgreich' };
                }
                return { ok: false, message: 'Musica International erreichbar, aber Login fehlgeschlagen' };
            }

            return { ok: true, message: 'Musica International erreichbar (Login nicht getestet)' };
        } catch (error) {
            return { ok: false, message: `Musica International nicht erreichbar: ${error.message}` };
        }
    }
}

module.exports = MusicaNetScraper;
