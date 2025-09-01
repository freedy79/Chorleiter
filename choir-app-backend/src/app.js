const express = require("express");
const cors = require("cors");
const app = express();
const helmet = require("helmet");
const compression = require("compression");
const RateLimit = require("express-rate-limit");
const path = require('path');

const logger = require("./config/logger");
const emailService = require('./services/email.service');

app.set("trust proxy", 1);

app.use(cors());
app.use(helmet());
app.use(compression());
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
    handler: (req, res, _next) => {
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

// --- Routes ---
const authRoutes = require("./routes/auth.routes");
const pieceRoutes = require("./routes/piece.routes");
const eventRoutes = require("./routes/event.routes");
const userRoutes = require("./routes/user.routes");
const composerRoutes = require("./routes/composer.routes");
const categoryRoutes = require("./routes/category.routes");
const repertoireRoutes = require("./routes/repertoire.routes");
const collectionRoutes = require("./routes/collection.routes");
const importRoutes = require("./routes/import.routes");
const authorRoutes = require("./routes/author.routes");
const publisherRoutes = require("./routes/publisher.routes");
const pieceChangeRoutes = require("./routes/piece-change.routes");
const adminRoutes = require("./routes/admin.routes");
const backupRoutes = require("./routes/backup.routes");
const choirManagementRoutes = require("./routes/choir-management.routes");
const invitationRoutes = require("./routes/invitation.routes");
const joinRoutes = require("./routes/join.routes");
const statsRoutes = require("./routes/stats.routes");
const searchRoutes = require("./routes/search.routes");
const passwordResetRoutes = require("./routes/password-reset.routes");
const emailChangeRoutes = require("./routes/email-change.routes");
const repertoireFilterRoutes = require("./routes/repertoire-filter.routes");
const monthlyPlanRoutes = require("./routes/monthlyPlan.routes");
const planRuleRoutes = require("./routes/planRule.routes");
const planEntryRoutes = require("./routes/planEntry.routes");
const availabilityRoutes = require("./routes/availability.routes");
const clientErrorRoutes = require("./routes/client-error.routes");
const postRoutes = require("./routes/post.routes");
const libraryRoutes = require("./routes/library.routes");
const programRoutes = require("./routes/program.routes");

app.use("/api/auth", authRoutes);
app.use("/api/pieces", pieceRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/users", userRoutes);
app.use("/api/composers", composerRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/repertoire", repertoireRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/import", importRoutes);
app.use("/api/authors", authorRoutes);
app.use("/api/publishers", publisherRoutes);
app.use("/api/piece-changes", pieceChangeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/choir-management", choirManagementRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/join", joinRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/email-change", emailChangeRoutes);
app.use("/api/repertoire-filters", repertoireFilterRoutes);
app.use("/api/monthly-plans", monthlyPlanRoutes);
app.use("/api/plan-rules", planRuleRoutes);
app.use("/api/plan-entries", planEntryRoutes);
app.use("/api/availabilities", availabilityRoutes);
app.use("/api/client-errors", clientErrorRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/programs", programRoutes);

// Handle 404 for unknown routes
app.use((req, res, _next) => {
    logger.warn(`404 - Not Found - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    res.status(404).send({ message: "Not Found" });
});

app.use((err, req, res, next) => {
    logger.error(
        `${err.status || 500} - ${err.message} - ${req.originalUrl} - ${
            req.method
        } - ${req.ip}`
    );
    logger.error(err.stack);
    emailService.notifyAdminsOnCrash(err, req).catch(e => {
        logger.error(`Error notifying admins of crash: ${e.message}`);
        logger.error(e.stack);
    });
    res.status(err.status || 500).send({
        message: "An internal server error occurred. Please try again later.",
    });
});

module.exports = app;
