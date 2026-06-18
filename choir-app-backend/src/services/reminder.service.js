const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const emailService = require('./email.service');
const pushService = require('./pushNotification.service');
const { getFrontendUrl } = require('../utils/frontend-url');
const { isoDateString, parseDateOnly } = require('../utils/date.utils');
const { encodeEventPrefillToken } = require('../utils/event-prefill-link');

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

    let totalSent = 0;
    let processedEvents = events.length;

    if (events.length) {
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
    }

    const missingEventResult = await checkAndSendMissingServiceEventReminders({ now });
    totalSent += missingEventResult.sent;
    processedEvents += missingEventResult.processed;

    logger.info(`[Reminder] Check complete. Processed ${processedEvents} items, sent ${totalSent} reminders.`);
    return { processed: processedEvents, sent: totalSent };
  } catch (err) {
    logger.error(`[Reminder] Error checking reminders: ${err.message}`);
    logger.error(err.stack);
    return { processed: 0, sent: 0, error: err.message };
  }
}

function buildMissingEventPrefillLink({ choirId, userId, planEntry }) {
  const eventDate = parseDateOnly(planEntry.date);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const token = encodeEventPrefillToken({
    purpose: 'missing-service-event-prefill',
    choirId,
    userId,
    planEntryId: planEntry.id,
    date: isoDateString(eventDate),
    type: 'SERVICE',
    notes: planEntry.notes || '',
    directorId: planEntry.directorId || null,
    monthlyPlanId: planEntry.monthlyPlanId || null,
    programId: planEntry.programId || null,
    expiresAt: expiresAt.toISOString()
  });

  return getFrontendUrl().then(frontendUrl => `${frontendUrl}/events?createEventToken=${encodeURIComponent(token)}`);
}

async function hasMatchingServiceEventForPlanEntry(planEntry, choirId) {
  const dateOnly = isoDateString(parseDateOnly(planEntry.date));
  const existingEvent = await db.event.findOne({
    where: {
      choirId,
      type: 'SERVICE',
      [Op.and]: [db.Sequelize.where(db.Sequelize.fn('date', db.Sequelize.col('date')), dateOnly)]
    },
    attributes: ['id']
  });
  return !!existingEvent;
}

async function findMissingServiceEventEntries({ now = new Date(), choirId } = {}) {
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setHours(0, 0, 0, 0);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const monthlyPlanInclude = {
    model: db.monthly_plan,
    as: 'monthlyPlan',
    attributes: ['id', 'choirId'],
    include: [{ model: db.choir, as: 'choir', attributes: ['id', 'name'] }],
    required: true
  };
  if (choirId) {
    monthlyPlanInclude.where = { choirId };
  }

  const entries = await db.plan_entry.findAll({
    where: {
      date: { [Op.gte]: thirtyDaysAgo, [Op.lte]: threeDaysAgo },
      directorId: { [Op.ne]: null }
    },
    include: [
      monthlyPlanInclude,
      {
        model: db.user,
        as: 'director',
        attributes: ['id', 'email', 'firstName', 'name', 'preferences']
      }
    ]
  });

  if (!entries.length) {
    return [];
  }

  const missingEntries = [];

  for (const entry of entries) {
    const scopedChoirId = entry.monthlyPlan?.choirId;
    const director = entry.director;

    if (!scopedChoirId || !director?.id) {
      continue;
    }

    const hasEvent = await hasMatchingServiceEventForPlanEntry(entry, scopedChoirId);
    if (hasEvent) {
      continue;
    }

    missingEntries.push({
      planEntryId: entry.id,
      monthlyPlanId: entry.monthlyPlanId,
      choirId: scopedChoirId,
      choirName: entry.monthlyPlan?.choir?.name || '',
      date: isoDateString(parseDateOnly(entry.date)),
      notes: entry.notes || '',
      directorId: director.id,
      directorName: [director.firstName, director.name].filter(Boolean).join(' ').trim() || director.name || '',
      directorEmail: director.email || ''
    });
  }

  return missingEntries;
}

async function checkAndSendMissingServiceEventReminders({ now = new Date(), choirId, dryRun = false } = {}) {
  const missingEntries = await findMissingServiceEventEntries({ now, choirId });
  if (!missingEntries.length) {
    return { processed: 0, sent: 0, candidates: [] };
  }

  if (dryRun) {
    return {
      processed: missingEntries.length,
      sent: 0,
      candidates: missingEntries
    };
  }

  let sent = 0;

  for (const candidate of missingEntries) {
    const scopedChoirId = candidate.choirId;
    const choirName = candidate.choirName;
    const director = await db.user.findByPk(candidate.directorId, {
      attributes: ['id', 'email', 'firstName', 'name', 'preferences']
    });
    const entry = await db.plan_entry.findByPk(candidate.planEntryId, {
      attributes: ['id', 'date', 'notes', 'directorId', 'monthlyPlanId', 'programId']
    });

    if (!scopedChoirId || !director?.id || !entry) {
      continue;
    }

    const prefs = director.preferences || {};
    const configuredChannels = prefs.rehearsalReminder?.enabled
      ? (Array.isArray(prefs.rehearsalReminder.channels) ? prefs.rehearsalReminder.channels : ['push'])
      : ['email', 'push'];
    const channels = Array.from(new Set(configuredChannels.filter(ch => ch === 'email' || ch === 'push')));
    if (channels.length === 0) {
      channels.push('email');
    }
    if (!director.email) {
      const idx = channels.indexOf('email');
      if (idx >= 0) channels.splice(idx, 1);
    }
    if (channels.length === 0) {
      channels.push('push');
    }

    const prefillLink = await buildMissingEventPrefillLink({ choirId: scopedChoirId, userId: director.id, planEntry: entry });
    const eventDateFormatted = formatEventDate(entry.date);

    for (const channel of channels) {
      const channelSent = await sendMissingEventReminderIfNotAlreadySent({
        user: director,
        choirId: scopedChoirId,
        choirName,
        planEntry: entry,
        eventDateFormatted,
        link: prefillLink,
        channel
      });

      if (channelSent) {
        sent++;
      }
    }
  }

  return { processed: missingEntries.length, sent, candidates: missingEntries };
}

async function sendMissingEventReminderIfNotAlreadySent({ user, choirId, choirName, planEntry, eventDateFormatted, link, channel }) {
  try {
    const existing = await db.missing_event_reminder_log.findOne({
      where: {
        userId: user.id,
        planEntryId: planEntry.id,
        reminderType: channel
      }
    });

    if (existing) return false;

    if (channel === 'email') {
      await sendMissingEventEmailReminder({ user, choirName, eventDateFormatted, notes: planEntry.notes, link });
    } else if (channel === 'push') {
      await sendMissingEventPushReminder({ userId: user.id, choirId, choirName, eventDateFormatted, link });
    }

    await db.missing_event_reminder_log.create({
      userId: user.id,
      choirId,
      planEntryId: planEntry.id,
      reminderType: channel,
      sentAt: new Date()
    });

    return true;
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return false;
    }
    logger.error(`[Reminder] Failed to send missing-event ${channel} reminder to user ${user.id} for planEntry ${planEntry.id}: ${err.message}`);
    return false;
  }
}

async function sendMissingEventPushReminder({ userId, choirId, choirName, eventDateFormatted, link }) {
  const payload = {
    notification: {
      title: `Fehlender Gottesdienst-Termin – ${choirName}`,
      body: `Bitte trage den Gottesdienst vom ${eventDateFormatted} als Ereignis nach.`,
      icon: '/assets/icons/icon-192x192.png',
      tag: `missing-service-event-${choirId}-${userId}-${eventDateFormatted}`,
      data: {
        url: link
      }
    }
  };

  await pushService.sendToUsersInChoir(choirId, [userId], payload);
}

async function sendMissingEventEmailReminder({ user, choirName, eventDateFormatted, notes, link }) {
  const replacements = {
    first_name: user.firstName || user.name,
    surname: user.name,
    event_type: 'Gottesdienst',
    event_date: eventDateFormatted,
    event_notes: notes || '',
    choir: choirName,
    link
  };

  await emailService.sendTemplateMail('missing-event-reminder', user.email, replacements);
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
  sendReminderIfNotAlreadySent,
  checkAndSendMissingServiceEventReminders,
  findMissingServiceEventEntries
};
