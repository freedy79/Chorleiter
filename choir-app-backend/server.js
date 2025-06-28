require("dotenv").config();
const app = require("./src/app");
const db = require("./src/models");
const bcrypt = require("bcryptjs");

const demoSeed = async () => {
    try {
        const [choir] = await db.choir.findOrCreate({
            where: { name: "Demo-Chor" },
            defaults: { name: "Demo-Chor", location: "Demohausen" }
        });

        const [demoUser] = await db.user.findOrCreate({
            where: { email: "demo@nak-chorleiter.de" },
            defaults: {
                name: "Demo User",
                email: "demo@nak-chorleiter.de",
                password: bcrypt.hashSync("demo", 8),
                role: "demo"
            }
        });

        await demoUser.addChoir(choir).catch(() => {});

        const collection = await db.collection.findByPk(1);
        if (collection) {
            await choir.addCollection(collection).catch(() => {});
        }
    } catch (err) {
        console.error("Error during demo seeding:", err);
    }
};

const initialSeed = async () => {
    try {
        // 1. Prüfen, ob bereits Benutzer existieren.
        const userCount = await db.user.count();

        // Wenn bereits ein oder mehrere Benutzer existieren, tun Sie nichts.
        if (userCount > 0) {
            console.log("Database already seeded. Skipping initial setup.");
            return;
        }

        console.log("No users found. Seeding initial admin user and choir...");

        // 2. Erstellen Sie den ersten Chor.
        // findOrCreate verhindert Duplikate, falls die Funktion doch mehrfach läuft.
        const [choir, createdChoir] = await db.choir.findOrCreate({
            where: { name: "My First Choir" },
            defaults: { name: "My First Choir" },
        });
        if (createdChoir) {
            console.log(`-> Choir "${choir.name}" created.`);
        }

        // 3. Erstellen Sie den Admin-Benutzer.
        const [adminUser, createdUser] = await db.user.findOrCreate({
            where: { email: "admin@nak-chorleiter.de" },
            defaults: {
                name: "Administrator",
                email: "admin@nak-chorleiter.de",
                password: bcrypt.hashSync("admin", 8), // Hashen Sie das Passwort!
                role: "admin",
            },
        });

        if (createdUser) {
            console.log(`-> Admin user "${adminUser.email}" created.`);
            // 4. Weisen Sie den Admin-Benutzer dem ersten Chor zu.
            await adminUser.addChoir(choir);
            console.log(`-> Admin user assigned to "${choir.name}".`);
        }

        console.log("Initial seeding completed successfully.");
    } catch (error) {
        console.error("Error during initial seeding:", error);
    }
};

const PORT = process.env.PORT || 8088;
const ADDRESS = process.env.ADDRESS || "localhost"

// In development, you might want to force-sync the DB
// db.sequelize.sync({ force: true }).then(() => {
//   console.log("Drop and re-sync db.");
// });
db.sequelize.sync({ alter: true })
    .then(() => {
        console.log("Database synchronized.");

        // Rufen Sie die Seed-Funktion auf.
        initialSeed();
        demoSeed();

    const server = app.listen(PORT, ADDRESS, () => {
        console.log(`Server is running on port ${PORT}, listening ${ADDRESS}.`);
    });
    // Close requests that take longer than 20 seconds
    server.setTimeout(20 * 1000);
    server.on('timeout', (socket) => {
        console.warn('Request timed out.');
        socket.destroy();
    });
});

   /*.catch((err) => {
        console.error("Database synchronization failed:", err);
    });*/

