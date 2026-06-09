const logger = require('../config/logger');
const { checkAndSendReminders, cleanupOldLogs } = require('./reminder.service');

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let checkInterval = null;
let cleanupInterval = null;

function startScheduler() {
  if (checkInterval) {
    return;
  }

  logger.info(`[RehearsalReminder] Scheduler started (check interval: ${CHECK_INTERVAL_MS / 60000}min)`);

  // Run first check after a short delay to let the server fully start
  setTimeout(() => {
    checkAndSendReminders();
  }, 10000);

  checkInterval = setInterval(checkAndSendReminders, CHECK_INTERVAL_MS);
  cleanupInterval = setInterval(cleanupOldLogs, CLEANUP_INTERVAL_MS);
}

function stopScheduler() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

module.exports = {
  startScheduler,
  stopScheduler
};
