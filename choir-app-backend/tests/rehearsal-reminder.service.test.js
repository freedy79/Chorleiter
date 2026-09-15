const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.JWT_SECRET = 'this-is-a-very-secret-key-change-it-1234567890';
process.env.ENCRYPTION_KEY = 'encryption-key-for-tests-1234567890';

const db = require('../src/models');
const reminderService = require('../src/services/reminder.service');
const emailService = require('../src/services/email.service');
const pushService = require('../src/services/pushNotification.service');
const { isoDateString, parseDateOnly } = require('../src/utils/date.utils');

(async () => {
  const originalSendTemplateMail = emailService.sendTemplateMail;
  const originalSendToUsersInChoir = pushService.sendToUsersInChoir;

  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Reminder Choir' });

    const director = await db.user.create({
      name: 'Leiter',
      firstName: 'Max',
      email: 'leiter@example.com'
    });
    const member = await db.user.create({
      name: 'Mitglied',
      firstName: 'Anna',
      email: 'anna@example.com',
      preferences: { rehearsalReminder: { enabled: true, daysBefore: 1, channels: ['email'] } }
    });
    const cancelled = await db.user.create({
      name: 'Absager',
      firstName: 'Bernd',
      email: 'bernd@example.com',
      preferences: { rehearsalReminder: { enabled: true, daysBefore: 1, channels: ['email'] } }
    });

    await db.user_choir.create({ userId: director.id, choirId: choir.id, rolesInChoir: ['director'], registrationStatus: 'REGISTERED' });
    await db.user_choir.create({ userId: member.id, choirId: choir.id, rolesInChoir: [], registrationStatus: 'REGISTERED' });
    await db.user_choir.create({ userId: cancelled.id, choirId: choir.id, rolesInChoir: [], registrationStatus: 'REGISTERED' });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 30, 0, 0);

    const event = await db.event.create({
      choirId: choir.id,
      date: tomorrow,
      type: 'REHEARSAL',
      notes: 'Probe im Saal',
      directorId: director.id
    });

    // "Bernd" has cancelled for the event date
    await db.user_availability.create({
      userId: cancelled.id,
      choirId: choir.id,
      date: isoDateString(parseDateOnly(event.date)),
      status: 'UNAVAILABLE'
    });

    const sentMails = [];
    emailService.sendTemplateMail = async (type, to, replacements) => {
      sentMails.push({ type, to, replacements });
    };
    pushService.sendToUsersInChoir = async () => {};

    const result = await reminderService.checkAndSendReminders();

    assert.strictEqual(result.sent, 1, 'Exactly one reminder should be sent');
    assert.strictEqual(sentMails.length, 1, 'Exactly one email should be sent');
    assert.strictEqual(sentMails[0].to, 'anna@example.com', 'Cancelled user must not receive a reminder');
    assert.strictEqual(sentMails[0].type, 'rehearsal-reminder');
    assert.strictEqual(sentMails[0].replacements.event_director, 'Max Leiter', 'Reminder must include the planned director name');

    console.log('rehearsal-reminder.service tests passed');
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
