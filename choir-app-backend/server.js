try {
    require("dotenv").config();
} catch (err) {
    console.error("Missing dependencies. Did you run 'npm install' in choir-app-backend?", err.message);
    process.exit(1);
}
const app = require("./src/app");
const { init } = require("./src/init");


const PORT = process.env.PORT || 8088;
const ADDRESS = process.env.ADDRESS || "localhost"

async function start() {
    try {
        await init({ includeDemoData: true });
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
}

start();
