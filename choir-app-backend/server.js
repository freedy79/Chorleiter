try {
    require("dotenv").config();
} catch (err) {
    console.error("Missing dependencies. Did you run 'npm install' in choir-app-backend?", err.message);
    process.exit(1);
}
const app = require("./src/app");
const db = require("./src/models");
const crypto = require("crypto");
const { seedDatabase } = require("./src/seed");


const PORT = process.env.PORT || 8088;
const ADDRESS = process.env.ADDRESS || "localhost"

console.log("Database synchronized.");

// In development, you might want to force-sync the DB
// db.sequelize.sync({ force: true }).then(() => {
//   console.log("Drop and re-sync db.");
// });
db.sequelize.sync({ alter: true })
    .then(() => {

        try {
            console.log("Database synchronized.");

            // Ensure all choirs have a join hash
            db.choir.findAll({ where: { joinHash: null } }).then(choirs => {
                choirs.forEach(async c => { c.joinHash = crypto.randomBytes(12).toString('hex'); await c.save(); });
            });

            // Seed database depending on environment
            seedDatabase({ includeDemoData: true });

            const server = app.listen(PORT, ADDRESS, () => {
                console.log(`Server is running on port ${PORT}, listening ${ADDRESS}.`);
            });
            // Close requests that take longer than 20 seconds
            server.setTimeout(20 * 1000);
            server.on('timeout', (socket) => {
                console.warn('Request timed out.');
                socket.destroy();
            });
        } catch (err) {
            console.error("Database startup failed:", err);
        }
});
