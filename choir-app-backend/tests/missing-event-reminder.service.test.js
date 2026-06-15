const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.JWT_SECRET = 'this-is-a-very-secret-key-change-it-1234567890';
process.env.ENCRYPTION_KEY = 'encryption-key-for-tests-1234567890';

const db = require('../src/models');
const reminderService = require('../src/services/reminder.service');
const emailService = require('../src/services/email.service');
const pushService = require('../src/services/pushNotification.service');

(async () => {
  const originalSendTemplateMail = emailService.sendTemplateMail;
  const originalSendToUsersInChoir = pushService.sendToUsersInChoir;

  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Reminder Choir' });
    const director = await db.user.create({
      name: 'Leiter',
      firstName: 'Max',
      email: 'leiter@example.com',
      preferences: { rehearsalReminder: { enabled: true, channels: ['email', 'push'] } }
    });

    await db.user_choir.create({ userId: director.id, choirId: choir.id, rolesInChoir: ['director'], registrationStatus: 'REGISTERED' });

    const monthlyPlan = await db.monthly_plan.create({ choirId: choir.id, year: 2026, month: 6 });
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 5);
    oldDate.setHours(12, 0, 0, 0);

    const planEntry = await db.plan_entry.create({
      monthlyPlanId: monthlyPlan.id,
      date: oldDate,
      notes: 'Gottesdienst 10 Uhr',
      directorId: director.id
    });

    let emailCount = 0;
    let pushCount = 0;

    emailService.sendTemplateMail = async () => {
      emailCount += 1;
    };
    pushService.sendToUsersInChoir = async () => {
      pushCount += 1;
    };

    const first = await reminderService.checkAndSendMissingServiceEventReminders(new Date());
    assert.strictEqual(first.processed, 1);
    assert.strictEqual(first.sent, 2);
    assert.strictEqual(emailCount, 1);
    assert.strictEqual(pushCount, 1);

    const logCount = await db.missing_event_reminder_log.count({ where: { planEntryId: planEntry.id } });
    assert.strictEqual(logCount, 2);

    const second = await reminderService.checkAndSendMissingServiceEventReminders(new Date());
    assert.strictEqual(second.processed, 1);
    assert.strictEqual(second.sent, 0);

    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  } finally {
    emailService.sendTemplateMail = originalSendTemplateMail;
    pushService.sendToUsersInChoir = originalSendToUsersInChoir;
  }
})();
