const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const helmet = require("helmet");
const compression = require("compression");
const RateLimit = require("express-rate-limit");
const path = require('path');

const logger = require("./config/logger");
const emailService = require('./services/email.service');
const { runWithRequestContext } = require('./config/request-context');
const { errorHandler, notFoundHandler, sequelizeErrorHandler } = require('./middleware/error.middleware');
const { csrfCookie, csrfProtection } = require('./middleware/csrf.middleware');
const postController = require("./controllers/post.controller");

app.set("trust proxy", 1);

// Initialize request-scoped context storage
app.use(runWithRequestContext);

const allowedOrigins = (process.env.CORS_ORIGINS || 'https://nak-chorleiter.de')
    .split(',')
    .map(o => o.trim());
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:4200', 'http://localhost:4201');
}
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN']
}));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
        },
    },
}));
app.use(compression());
app.use(cookieParser());
app.use(csrfCookie);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(['/uploads', '/api/uploads'], express.static(path.join(__dirname, '..', 'uploads')));

if (process.env.NODE_ENV != "production") {
    app.use((req, res, next) => {
        // Es ist nützlich zu sehen, ob OPTIONS-Anfragen ankommen.
        logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`);
        next();
    });
}

// Set up rate limiter: maximum of RATE_LIMIT_MAX requests per minute (default 200)
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 200;
const limiter = RateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`429 - Too Many Requests - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        res.status(429).send({
            message: "Too many requests, please try again later.",
        });
    },
});
// Apply rate limiter to all requests
app.use(limiter);

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Choir App API." });
});
app.get(["/ping", "/api/ping"], (req, res) => {
    res.json({ message: "PONG" });
});
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Public post image access (no auth, token-based for email recipients)
// URL may contain a file extension (e.g. .png) for email client compatibility – stripped in controller
app.get("/api/public/post-images/:token", postController.getImageByToken);

// CSRF protection: validate token on state-changing requests for authenticated routes.
// Excluded: auth (login/signup/logout), password-reset, join (public endpoints), client-errors (error reporting).
app.use('/api', (req, res, next) => {
    const exemptPrefixes = ['/api/auth/', '/api/password-reset', '/api/join', '/api/client-errors', '/api/public/', '/api/page-views/track-public'];
    if (exemptPrefixes.some(prefix => req.originalUrl.startsWith(prefix))) {
        return next();
    }
    csrfProtection(req, res, next);
});

// --- Routes ---
const { registerRoutes } = require('./routes');
registerRoutes(app);

// Error Handling Middleware (must be AFTER all routes)
// 1. Handle 404 for unknown routes
app.use(notFoundHandler);

// 2. Convert Sequelize errors to standardized errors
app.use(sequelizeErrorHandler);

// 3. Global error handler
app.use((err, req, res, next) => {
    // Send admin notification for non-operational errors
    if (!err.isOperational) {
        emailService.notifyAdminsOnCrash(err, req).catch(e => {
            logger.error(`Error notifying admins of crash: ${e.message}`);
            logger.error(e.stack);
        });
    }

    // Use the standardized error handler
    errorHandler(err, req, res, next);
});

module.exports = app;
