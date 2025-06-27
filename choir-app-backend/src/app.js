const express = require("express");
const cors = require("cors");
const app = express();
const helmet = require("helmet");
const RateLimit = require("express-rate-limit");

const logger = require("./config/logger");

app.set("trust proxy", 1);

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV != "production") {
    app.use((req, res, next) => {
        // Es ist nützlich zu sehen, ob OPTIONS-Anfragen ankommen.
        logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`);
        next();
    });
}

// Set up rate limiter: maximum of twenty requests per minute
const limiter = RateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Erhöhen Sie das Limit auf einen vernünftigeren Wert
    standardHeaders: true,
    legacyHeaders: false,
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
const pieceChangeRoutes = require("./routes/piece-change.routes");
const adminRoutes = require("./routes/admin.routes");
const choirManagementRoutes = require("./routes/choir-management.routes");
const invitationRoutes = require("./routes/invitation.routes");
const statsRoutes = require("./routes/stats.routes");

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
app.use("/api/piece-changes", pieceChangeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/choir-management", choirManagementRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/stats", statsRoutes);

app.use((err, req, res, next) => {
    logger.error(
        `${err.status || 500} - ${err.message} - ${req.originalUrl} - ${
            req.method
        } - ${req.ip}`
    );
    logger.error(err.stack);
    res.status(err.status || 500).send({
        message: "An internal server error occurred. Please try again later.",
    });
});

module.exports = app;
