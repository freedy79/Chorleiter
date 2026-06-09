const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const emailService = require('./email.service');
const pushService = require('./pushNotification.service');
const { getFrontendUrl } = require('../utils/frontend-url');

const TIME_ZONE = process.env.TZ || 'Europe/Berlin';

/**
 * Formats an event date for display in German locale.
 */
function formatEventDate(date) {
  return new Date(date).toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: TIME_ZONE
  });
}

/**
 * Returns the event type label in German.
 */
function eventTypeLabel(type) {
  return type === 'REHEARSAL' ? 'Probe' : 'Gottesdienst';
}

/**
 * Main function: checks all upcoming events and sends reminders
 * to users who have configured rehearsalReminder preferences.
 *
 * Runs periodically via cron scheduler.
 */
async function checkAndSendReminders() {
  try {
    const now = new Date();

    // Find all events within the next 3 days (max reminder window)
    const maxDaysAhead = 3;
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + maxDaysAhead + 1);
    windowEnd.setHours(0, 0, 0, 0);

    const events = await db.event.findAll({
      where: {
        date: {
          [Op.gte]: now,
          [Op.lt]: windowEnd
        }
      },
      include: [{ model: db.choir, as: 'choir', attributes: ['id', 'name'] }]
    });

    if (!events.length) {
      return { processed: 0, sent: 0 };
    }

    let totalSent = 0;

    for (const event of events) {
      const choirId = event.choirId || event.choir?.id;
      if (!choirId) continue;

      // Calculate how many days until this event
      const eventDate = new Date(event.date);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const eventDayStart = new Date(eventDate);
      eventDayStart.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((eventDayStart - todayStart) / (1000 * 60 * 60 * 24));

      if (daysUntil < 1 || daysUntil > maxDaysAhead) continue;

      // Get all members of this choir with their preferences
      const memberships = await db.user_choir.findAll({
        where: { choirId, registrationStatus: 'REGISTERED' },
        include: [{
          model: db.user,
          attributes: ['id', 'email', 'firstName', 'name', 'preferences']
        }]
      });

      for (const membership of memberships) {
        const user = membership.user;
        if (!user) continue;

        const prefs = user.preferences || {};
        const reminder = prefs.rehearsalReminder;
        if (!reminder || !reminder.enabled) continue;

        const daysBefore = reminder.daysBefore || 1;
        if (daysUntil !== daysBefore) continue;

        const channels = Array.isArray(reminder.channels) ? reminder.channels : ['push'];
        const choirName = event.choir?.name || '';

        for (const channel of channels) {
          if (channel !== 'push' && channel !== 'email') continue;

          const sent = await sendReminderIfNotAlreadySent({
            userId: user.id,
            choirId,
            event,
            daysBefore,
            channel,
            user,
            choirName
          });
          if (sent) totalSent++;
        }
      }
    }

    logger.info(`[Reminder] Check complete. Processed ${events.length} events, sent ${totalSent} reminders.`);
    return { processed: events.length, sent: totalSent };
  } catch (err) {
    logger.error(`[Reminder] Error checking reminders: ${err.message}`);
    logger.error(err.stack);
    return { processed: 0, sent: 0, error: err.message };
  }
}

/**
 * Sends a single reminder if it hasn't been sent already.
 * Uses reminder_log to prevent duplicates.
 */
async function sendReminderIfNotAlreadySent({ userId, choirId, event, daysBefore, channel, user, choirName }) {
  try {
    // Check if already sent
    const existing = await db.reminder_log.findOne({
      where: {
        userId,
        eventId: event.id,
        daysBefore,
        reminderType: channel
      }
    });

    if (existing) return false;

    const eventDateFormatted = formatEventDate(event.date);
    const typeLabel = eventTypeLabel(event.type);

    if (channel === 'push') {
      await sendPushReminder({ userId, choirId, event, typeLabel, eventDateFormatted, choirName });
    } else if (channel === 'email') {
      await sendEmailReminder({ user, event, typeLabel, eventDateFormatted, choirName });
    }

    // Log the sent reminder
    await db.reminder_log.create({
      userId,
      choirId,
      eventId: event.id,
      daysBefore,
      reminderType: channel,
      sentAt: new Date()
    });

    return true;
  } catch (err) {
    // If unique constraint violation, another process already sent it
    if (err.name === 'SequelizeUniqueConstraintError') {
      return false;
    }
    logger.error(`[Reminder] Failed to send ${channel} reminder to user ${userId} for event ${event.id}: ${err.message}`);
    return false;
  }
}

async function sendPushReminder({ userId, choirId, event, typeLabel, eventDateFormatted, choirName }) {
  const frontendUrl = await getFrontendUrl();
  const payload = {
    notification: {
      title: `${typeLabel} – ${choirName}`,
      body: `Erinnerung: ${typeLabel} am ${eventDateFormatted}`,
      icon: '/assets/icons/icon-192x192.png',
      tag: `rehearsal-reminder-${event.id}`,
      data: {
        url: `${frontendUrl}/events`
      }
    }
  };

  await pushService.sendToUsersInChoir(choirId, [userId], payload);
}

async function sendEmailReminder({ user, event, typeLabel, eventDateFormatted, choirName }) {
  const replacements = {
    first_name: user.firstName || user.name,
    surname: user.name,
    event_type: typeLabel,
    event_date: eventDateFormatted,
    event_notes: event.notes || '',
    choir: choirName
  };

  await emailService.sendTemplateMail('rehearsal-reminder', user.email, replacements);
}

/**
 * Cleans up old reminder logs (older than 90 days) to prevent table bloat.
 */
async function cleanupOldLogs() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const deleted = await db.reminder_log.destroy({
      where: { sentAt: { [Op.lt]: cutoff } }
    });
    if (deleted > 0) {
      logger.info(`[Reminder] Cleaned up ${deleted} old reminder logs.`);
    }
  } catch (err) {
    logger.error(`[Reminder] Error cleaning up old logs: ${err.message}`);
  }
}

module.exports = {
  checkAndSendReminders,
  cleanupOldLogs,
  // Exported for testing
  formatEventDate,
  eventTypeLabel,
  sendReminderIfNotAlreadySent
};
