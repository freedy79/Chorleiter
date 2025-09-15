const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./models");
const logger = require("./config/logger");

async function seedDatabase(options = {}) {
    const { includeDemoData = false } = options;

    try {
        // Initial seed
        const userCount = await db.user.count();
        if (userCount === 0) {
            logger.info("No users found. Seeding initial admin user and choir...");
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

            await db.mail_template.findOrCreate({
                where: { type: 'email-change' },
                defaults: {
                    subject: 'Bestätige deine neue E-Mail-Adresse',
                    body: '<p>Hallo {{first_name}} {{surname}},</p><p>bitte bestätige deine neue E-Mail-Adresse über <a href="{{link}}">diesen Link</a>.</p><p>Der Link ist bis {{expiry}} gültig.</p>'
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
            logger.info("Initial seeding completed successfully.");
        } else {
            logger.info("Database already seeded. Skipping initial setup.");
        }
        const districts = [
            { name: 'Braunschweig', code: 'BS' },
            { name: 'Göttingen', code: 'GÖ' },
            { name: 'Hannover-Nordost', code: 'H-NO' },
            { name: 'Hannover-Südwest', code: 'H-SW' },
            { name: 'Hildesheim', code: 'HI' },
            { name: 'Lübeck-Schwerin', code: 'L-S' },
            { name: 'Lüneburg', code: 'LG' },
            { name: 'Magdeburg', code: 'MD' },
            { name: 'Wolfenbüttel', code: 'WF' }
        ];
        for (const d of districts) {
            const [district, created] = await db.district.findOrCreate({ where: { name: d.name }, defaults: d });
            // Backfill missing codes for existing districts
            if (!created && !district.code) {
                district.code = d.code;
                await district.save();
            }
        }
    } catch (error) {
        logger.error("Error during initial seeding:", error);
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
            logger.error("Error during demo seeding:", err);
        }
    }
}

module.exports = { seedDatabase };
