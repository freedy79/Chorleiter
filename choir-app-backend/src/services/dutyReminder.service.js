const db = require('../models');
const logger = require('../config/logger');
const pushNotificationService = require('./pushNotification.service');
const { Op } = require('sequelize');

const REMINDER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const REMINDER_HOURS_BEFORE = 48;

// Track which events already had reminders sent (eventId -> true)
const sentReminders = new Set();

// Clean up old entries every 24 hours to prevent memory leak
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function checkAndSendReminders() {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + (REMINDER_HOURS_BEFORE - 1) * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (REMINDER_HOURS_BEFORE + 0.5) * 60 * 60 * 1000);

    // Find upcoming SERVICE events within the reminder window
    const events = await db.event.findAll({
      where: {
        type: 'SERVICE',
        date: { [Op.between]: [windowStart, windowEnd] }
      },
      include: [{ model: db.choir, as: 'choir', attributes: ['id', 'name'] }]
    });

    for (const event of events) {
      const reminderKey = `event-${event.id}`;
      if (sentReminders.has(reminderKey)) {
        continue;
      }

      if (!event.choir) {
        continue;
      }

      const eventDate = new Date(event.date);
      const dateStr = eventDate.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const timeStr = eventDate.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const payload = {
        title: `Anstehender Dienst – ${event.choir.name}`,
        body: `${dateStr} um ${timeStr}${event.notes ? ' · ' + event.notes : ''}`,
        icon: '/assets/icons/icon-192x192.png',
        url: '/events',
        data: { url: '/events' }
      };

      await pushNotificationService.sendToChoirMembers(event.choir.id, payload);
      sentReminders.add(reminderKey);
      logger.info(`Duty reminder sent for event ${event.id} (${event.choir.name}, ${dateStr})`);
    }

    // Also check plan_entries (finalized duty roster entries)
    const planEntries = await db.plan_entry.findAll({
      where: {
        date: { [Op.between]: [windowStart, windowEnd] }
      },
      include: [{
        model: db.monthly_plan,
        as: 'monthlyPlan',
        attributes: ['id', 'choirId'],
        include: [{ model: db.choir, as: 'choir', attributes: ['id', 'name'] }]
      }]
    });

    for (const entry of planEntries) {
      const reminderKey = `plan-${entry.id}`;
      if (sentReminders.has(reminderKey)) {
        continue;
      }

      const choir = entry.monthlyPlan?.choir;
      if (!choir) {
        continue;
      }

      const entryDate = new Date(entry.date);
      const dateStr = entryDate.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const timeStr = entryDate.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const payload = {
        title: `Anstehender Dienst – ${choir.name}`,
        body: `${dateStr} um ${timeStr}${entry.notes ? ' · ' + entry.notes : ''}`,
        icon: '/assets/icons/icon-192x192.png',
        url: '/events',
        data: { url: '/events' }
      };

      // Notify specifically assigned users (director, organist)
      const targetUserIds = [entry.directorId, entry.organistId].filter(Boolean);
      if (targetUserIds.length > 0) {
        await pushNotificationService.sendToUsersInChoir(choir.id, targetUserIds, payload);
      }

      sentReminders.add(reminderKey);
      logger.info(`Duty reminder sent for plan entry ${entry.id} (${choir.name}, ${dateStr})`);
    }
  } catch (err) {
    logger.error(`Duty reminder check failed: ${err.message}`);
  }
}

function cleanupOldReminders() {
  sentReminders.clear();
  logger.debug('Duty reminder tracking cache cleared.');
}

let reminderInterval = null;
let cleanupInterval = null;

function startScheduler() {
  if (reminderInterval) {
    return;
  }

  logger.info(`Duty reminder scheduler started (interval: ${REMINDER_INTERVAL_MS / 60000}min, window: ${REMINDER_HOURS_BEFORE}h before event)`);

  // Run immediately on start, then on interval
  checkAndSendReminders();
  reminderInterval = setInterval(checkAndSendReminders, REMINDER_INTERVAL_MS);
  cleanupInterval = setInterval(cleanupOldReminders, CLEANUP_INTERVAL_MS);
}

function stopScheduler() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  checkAndSendReminders
};
