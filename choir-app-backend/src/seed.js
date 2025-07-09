const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./models");

async function seedDatabase(options = {}) {
    const { includeDemoData = false } = options;

    try {
        // Initial seed
        const userCount = await db.user.count();
        if (userCount === 0) {
            console.log("No users found. Seeding initial admin user and choir...");
            const [choir] = await db.choir.findOrCreate({
                where: { name: "My First Choir" },
                defaults: { name: "My First Choir" },
            });
            if (!choir.joinHash) {
                choir.joinHash = crypto.randomBytes(12).toString('hex');
                await choir.save();
            }
            const [adminUser, createdUser] = await db.user.findOrCreate({
                where: { email: "admin@nak-chorleiter.de" },
                defaults: {
                    name: "Administrator",
                    email: "admin@nak-chorleiter.de",
                    password: bcrypt.hashSync("admin", 8),
                    role: "admin",
                },
            });
            if (createdUser) {
                await adminUser.addChoir(choir);
            }
            await db.mail_setting.findOrCreate({
                where: { id: 1 },
                defaults: {
                    host: process.env.SMTP_HOST || 'localhost',
                    port: process.env.SMTP_PORT || 587,
                    user: process.env.SMTP_USER || '',
                    pass: process.env.SMTP_PASS || '',
                    secure: false,
                    fromAddress: process.env.EMAIL_FROM || 'no-reply@example.com'
                }
            });
            console.log("Initial seeding completed successfully.");
        } else {
            console.log("Database already seeded. Skipping initial setup.");
        }
    } catch (error) {
        console.error("Error during initial seeding:", error);
    }

    if (includeDemoData) {
        try {
            const [choir] = await db.choir.findOrCreate({
                where: { name: "Demo-Chor" },
                defaults: { name: "Demo-Chor", location: "Demohausen" }
            });
            if (!choir.joinHash) {
                choir.joinHash = crypto.randomBytes(12).toString('hex');
                await choir.save();
            }
            const [demoUser] = await db.user.findOrCreate({
                where: { email: "demo@nak-chorleiter.de" },
                defaults: {
                    name: "Demo User",
                    email: "demo@nak-chorleiter.de",
                    password: bcrypt.hashSync("demo", 8),
                    role: "demo"
                }
            });
            await demoUser.addChoir(choir).catch(() => { });
            const collection = await db.collection.findByPk(1);
            if (collection) {
                await choir.addCollection(collection).catch(() => { });
            }
        } catch (err) {
            console.error("Error during demo seeding:", err);
        }
    }
}

module.exports = { seedDatabase };
