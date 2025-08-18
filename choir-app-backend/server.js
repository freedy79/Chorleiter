try {
    require("dotenv").config();
} catch (err) {
    console.error("Missing dependencies. Did you run 'npm install' in choir-app-backend?", err.message);
    process.exit(1);
}
const app = require("./src/app");
const { init } = require("./src/init");
const logger = require("./src/config/logger");
const { sendCrashReportMail } = require("./src/services/email.service");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
let shuttingDown = false;

async function handleFatal(error) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.error("Fatal error:", error);
    try {
        await sendCrashReportMail(ADMIN_EMAIL, error);
    } catch (e) {
        logger.error("Failed to send crash report mail:", e);
    } finally {
        process.exit(1);
    }
}

process.on('uncaughtException', handleFatal);
process.on('unhandledRejection', handleFatal);


const PORT = process.env.PORT || 8088;
const ADDRESS = process.env.ADDRESS || "localhost"

async function start() {
    try {
        await init({ includeDemoData: true });
        const server = app.listen(PORT, ADDRESS, () => {
            logger.info(`Server is running on port ${PORT}, listening ${ADDRESS}.`);
        });
        // Close requests that take longer than 20 seconds
        server.setTimeout(20 * 1000);
        server.on('timeout', (socket) => {
            logger.warn('Request timed out.');
            socket.destroy();
        });
    } catch (err) {
        logger.error("Database startup failed:", err);
    }
}

start();
