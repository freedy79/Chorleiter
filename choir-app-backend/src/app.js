const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const RateLimit = require("express-rate-limit");

const app = express();
const compression = require("compression");

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
    },
  }),
);
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up rate limiter: maximum of twenty requests per minute
const limiter = RateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
});
// Apply rate limiter to all requests
app.use(limiter);


// --- Routes ---
const authRoutes = require('./routes/auth.routes');
const pieceRoutes = require('./routes/piece.routes');
const eventRoutes = require('./routes/event.routes');
const userRoutes = require('./routes/user.routes');
const composerRoutes = require('./routes/composer.routes');
const categoryRoutes = require('./routes/category.routes');
const repertoireRoutes = require('./routes/repertoire.routes');
const collectionRoutes = require('./routes/collection.routes');
const importRoutes = require('./routes/import.routes');
const authorRoutes = require('./routes/author.routes');
const adminRoutes = require('./routes/admin.routes');
const choirManagementRoutes = require('./routes/choir-management.routes');

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Choir App API." });
});

app.get("/ping", (req, res) => {
    res.json({ message: "PONG" });
});

app.use('/api/auth', authRoutes);
app.use('/api/pieces', pieceRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/composers', composerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/repertoire', repertoireRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/import', importRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/choir-management', choirManagementRoutes);

module.exports = app;
