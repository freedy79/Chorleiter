const crypto = require('crypto');
const logger = require('../config/logger');

const DEBUG_CSRF = (process.env.DEBUG_CSRF || '').toLowerCase() === 'true'
    || (process.env.DEBUG_AUTH || '').toLowerCase() === 'true';

/**
 * CSRF protection using the Double-Submit Cookie pattern.
 *
 * On every response a random CSRF token is set as a readable cookie
 * (XSRF-TOKEN). The client must echo this value back as the
 * X-XSRF-TOKEN header on state-changing requests (POST, PUT, DELETE, PATCH).
 *
 * Angular's HttpClient does this automatically when it detects
 * the XSRF-TOKEN cookie (built-in XSRF support).
 */

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware that sets the XSRF-TOKEN cookie on every response.
 */
function csrfCookie(req, res, next) {
    // Only set a new token if there isn't one yet
    if (!req.cookies?.['XSRF-TOKEN']) {
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('XSRF-TOKEN', generateToken(), {
            httpOnly: false, // Must be readable by JavaScript
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/'
        });
    }
    next();
}

/**
 * Middleware that validates CSRF tokens on state-changing requests.
 */
function csrfProtection(req, res, next) {
    // Skip safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const cookieToken = req.cookies?.['XSRF-TOKEN'];
    const headerToken = req.headers['x-xsrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        if (DEBUG_CSRF) {
            logger.warn('CSRF token validation failed', {
                method: req.method,
                path: req.originalUrl,
                hasCookieToken: Boolean(cookieToken),
                hasHeaderToken: Boolean(headerToken),
                cookieTokenLength: cookieToken ? cookieToken.length : 0,
                headerTokenLength: headerToken ? headerToken.length : 0,
                origin: req.headers.origin,
                referer: req.headers.referer,
                ip: req.ip
            });
        }
        return res.status(403).json({ message: 'CSRF token validation failed' });
    }

    next();
}

module.exports = { csrfCookie, csrfProtection };
