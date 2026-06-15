const assert = require('assert');
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'true';

const db = require('../src/models');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const user = await db.user.create({ email: 'user@example.com', firstName: 'Max', name: 'Mustermann', roles: ['user'] });
    await db.user.create({ email: 'admin1@example.com', roles: ['admin'] });
    await db.user.create({ email: 'admin2@example.com', roles: ['admin'] });
    await db.user.create({ email: 'other@example.com', roles: ['librarian'] });

    const emailService = require('../src/services/email.service');
    const original = emailService.sendImprovementSuggestionMail;
    let capturedRecipients = null;
    let capturedPayload = null;
    emailService.sendImprovementSuggestionMail = async (recipients, payload) => {
      capturedRecipients = recipients;
      capturedPayload = payload;
    };

    const controller = require('../src/controllers/feedback.controller');

    let statusCode;
    const res = {
      status(code) { statusCode = code; return this; },
      send(data) { this.data = data; if (!statusCode) statusCode = 200; return this; }
    };

    await controller.submitImprovementSuggestion({
      body: { message: 'Bitte eine dunklere Darstellung hinzufügen.' },
      userId: user.id
    }, res);

    assert.strictEqual(statusCode, 200);
    assert.ok(Array.isArray(capturedRecipients));
    assert.deepStrictEqual(capturedRecipients.sort(), ['admin1@example.com', 'admin2@example.com', 'user@example.com'].sort());
    assert.strictEqual(capturedPayload.senderEmail, 'user@example.com');
    assert.ok(capturedPayload.message.includes('dunklere Darstellung'));

    statusCode = undefined;
    await controller.submitImprovementSuggestion({ body: { message: '   ' }, userId: user.id }, res);
    assert.strictEqual(statusCode, 400);

    emailService.sendImprovementSuggestionMail = original;

    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
