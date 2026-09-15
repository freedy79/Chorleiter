const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.JWT_SECRET = 'this-is-a-very-secret-key-change-it-1234567890';
process.env.ENCRYPTION_KEY = 'encryption-key-for-tests-1234567890';

const db = require('../src/models');
const eventController = require('../src/controllers/event.controller');
const emailService = require('../src/services/email.service');
const pushService = require('../src/services/pushNotification.service');

function makeRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) { this.statusCode = code; return this; },
    send(data) { this.data = data; return this; }
  };
}

(async () => {
  const originalEmail = emailService.sendTemplateMail;
  const originalPush = pushService.sendToUsersInChoir;

  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Preview Choir' });
    const director = await db.user.create({
      firstName: 'Anna',
      name: 'Leitung',
      email: 'anna@example.com',
      preferences: { rehearsalReminder: { enabled: true, channels: ['email', 'push'] } }
    });
    await db.user_choir.create({
      userId: director.id,
      choirId: choir.id,
      rolesInChoir: ['director'],
      registrationStatus: 'REGISTERED'
    });

    const monthlyPlan = await db.monthly_plan.create({ choirId: choir.id, year: 2026, month: 6 });
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 4);
    oldDate.setHours(11, 0, 0, 0);

    await db.plan_entry.create({
      monthlyPlanId: monthlyPlan.id,
      date: oldDate,
      notes: 'Hauptgottesdienst',
      directorId: director.id
    });

    let sentEmails = 0;
    let sentPushes = 0;
    emailService.sendTemplateMail = async () => { sentEmails += 1; };
    pushService.sendToUsersInChoir = async () => { sentPushes += 1; };

    const previewReq = { activeChoirId: choir.id, query: {} };
    const previewRes = makeRes();
    await eventController.previewMissingServiceEvents(previewReq, previewRes);

    assert.strictEqual(previewRes.statusCode, 200);
    assert.strictEqual(previewRes.data.sent, 0);
    assert.strictEqual(previewRes.data.processed, 1);
    assert.ok(Array.isArray(previewRes.data.candidates));
    assert.strictEqual(previewRes.data.candidates.length, 1);
    assert.strictEqual(sentEmails, 0);
    assert.strictEqual(sentPushes, 0);

    const sendReq = { activeChoirId: choir.id, body: {} };
    const sendRes = makeRes();
    await eventController.sendMissingServiceEventReminders(sendReq, sendRes);

    assert.strictEqual(sendRes.statusCode, 200);
    assert.strictEqual(sendRes.data.processed, 1);
    assert.strictEqual(sendRes.data.sent, 2);
    assert.strictEqual(sentEmails, 1);
    assert.strictEqual(sentPushes, 1);

    const secondSendRes = makeRes();
    await eventController.sendMissingServiceEventReminders(sendReq, secondSendRes);
    assert.strictEqual(secondSendRes.statusCode, 200);
    assert.strictEqual(secondSendRes.data.sent, 0);

    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  } finally {
    emailService.sendTemplateMail = originalEmail;
    pushService.sendToUsersInChoir = originalPush;
  }
})();
