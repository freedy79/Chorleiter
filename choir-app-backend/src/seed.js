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
                    roles: ["admin"],
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
                    starttls: false,
                    fromAddress: process.env.EMAIL_FROM || 'no-reply@nak-chorleiter.de'
                }
            });

            await db.mail_template.findOrCreate({
                where: { type: 'invite' },
                defaults: {
                    subject: 'Invitation to join {{choir}}',
                    body: '<p>You have been invited to join <b>{{choir}}</b>.<br>Click <a href="{{link}}">here</a> to complete your registration. This link is valid until {{expiry}}.</p>'
                }
            });

            await db.mail_template.findOrCreate({
                where: { type: 'reset' },
                defaults: {
                    subject: 'Password Reset',
                    body: '<p>Click <a href="{{link}}">here</a> to set a new password.</p>'
                }
            });

            await db.mail_template.findOrCreate({
                where: { type: 'availability-request' },
                defaults: {
                    subject: 'Verfügbarkeitsanfrage {{month}}/{{year}}',
                    body: '<p>Bitte teile uns deine Verfügbarkeit für {{month}}/{{year}} mit.</p>{{list}}<p><a href="{{link}}">Verfügbarkeit eintragen</a></p>'
                }
            });

            await db.mail_template.findOrCreate({
                where: { type: 'piece-change' },
                defaults: {
                    subject: 'Neuer Änderungsvorschlag zu {{piece}}',
                    body: '<p>{{proposer}} hat eine Änderung zu <b>{{piece}}</b> vorgeschlagen.</p><p><a href="{{link}}">Änderung ansehen</a></p>'
                }
            });

            await db.mail_template.findOrCreate({
                where: { type: 'monthly-plan' },
                defaults: {
                    subject: 'Dienstplan {{month}}/{{year}}',
                    body: '<p>Im Anhang befindet sich der aktuelle Dienstplan.</p><p><a href="{{link}}">Dienstplan online ansehen</a></p>'
                }
            });

            await db.system_setting.findOrCreate({
                where: { key: 'FRONTEND_URL' },
                defaults: { value: process.env.FRONTEND_URL || 'https://nak-chorleiter.de' }
            });
            await db.system_setting.findOrCreate({
                where: { key: 'SYSTEM_ADMIN_EMAIL' },
                defaults: { value: process.env.SYSTEM_ADMIN_EMAIL || '' }
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
                    roles: ["demo"]
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
