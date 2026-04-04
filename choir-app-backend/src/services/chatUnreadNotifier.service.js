const db = require('../models');
const logger = require('../config/logger');
const { sendTemplateMail } = require('./email.service');
const { getFrontendUrl } = require('../utils/frontend-url');
const { Op, fn, col, literal } = require('sequelize');

// Check every 6 hours
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Notify after 3 days of unread messages
const UNREAD_THRESHOLD_DAYS = 3;

// Don't re-notify within 7 days for the same room
const RE_NOTIFY_COOLDOWN_DAYS = 7;

// Track sent notifications: "userId-roomId" → timestamp
const sentNotifications = new Map();

// Cleanup old tracking entries every 24h
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Find users who have unread chat messages older than UNREAD_THRESHOLD_DAYS
 * and send them an email notification.
 */
async function checkAndNotifyUnreadMessages() {
  try {
    const thresholdDate = new Date(Date.now() - UNREAD_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    const frontendUrl = await getFrontendUrl();

    // Get all choirs with their chat rooms
    const choirs = await db.choir.findAll({
      attributes: ['id', 'name'],
      include: [{
        model: db.chat_room,
        as: 'chatRooms',
        attributes: ['id', 'key', 'title', 'isPrivate']
      }]
    });

    for (const choir of choirs) {
      if (!choir.chatRooms || choir.chatRooms.length === 0) continue;

      // Get all active choir members (not pending, not leaving)
      const choirMembers = await db.user_choir.findAll({
        where: {
          choirId: choir.id,
          registrationStatus: 'REGISTERED',
          leaveRequestedAt: null
        },
        include: [{
          model: db.user,
          attributes: ['id', 'firstName', 'name', 'email'],
          where: {
            deletionRequestedAt: null,
            // Exclude demo users
            roles: { [Op.not]: null }
          }
        }]
      });

      for (const room of choir.chatRooms) {
        // Find the latest message in this room
        const latestMessage = await db.chat_message.findOne({
          where: {
            chatRoomId: room.id,
            deletedAt: null
          },
          order: [['id', 'DESC']],
          include: [{
            model: db.user,
            as: 'author',
            attributes: ['id', 'firstName', 'name']
          }]
        });

        if (!latestMessage) continue;

        // Only consider rooms where the latest message is older than threshold
        // (so the user has had 3 days to read it)
        if (new Date(latestMessage.createdAt) > thresholdDate) continue;

        // Get private room member IDs (if applicable)
        let privateRoomMemberIds = null;
        if (room.isPrivate) {
          const members = await db.chat_room_member.findAll({
            where: { chatRoomId: room.id },
            attributes: ['userId']
          });
          privateRoomMemberIds = new Set(members.map(m => m.userId));
        }

        for (const membership of choirMembers) {
          const user = membership.user;
          if (!user || !user.email) continue;

          // Skip demo users
          const userRoles = user.getDataValue('roles');
          if (Array.isArray(userRoles) && userRoles.includes('demo')) continue;

          // For private rooms, user must be a member
          if (privateRoomMemberIds && !privateRoomMemberIds.has(user.id)) continue;

          // Skip the author of the latest message
          if (latestMessage.userId === user.id) continue;

          // Check read state for this user in this room
          const readState = await db.chat_read_state.findOne({
            where: {
              chatRoomId: room.id,
              userId: user.id
            }
          });

          // Determine if user has unread messages older than threshold
          const lastReadId = readState?.lastReadMessageId || 0;
          if (lastReadId >= latestMessage.id) continue;

          // Count unread messages
          const unreadCount = await db.chat_message.count({
            where: {
              chatRoomId: room.id,
              id: { [Op.gt]: lastReadId },
              deletedAt: null,
              userId: { [Op.ne]: user.id }
            }
          });

          if (unreadCount === 0) continue;

          // Find the oldest unread message date
          const oldestUnread = await db.chat_message.findOne({
            where: {
              chatRoomId: room.id,
              id: { [Op.gt]: lastReadId },
              deletedAt: null,
              userId: { [Op.ne]: user.id }
            },
            order: [['id', 'ASC']],
            attributes: ['createdAt']
          });

          // Only notify if the oldest unread is older than threshold
          if (!oldestUnread || new Date(oldestUnread.createdAt) > thresholdDate) continue;

          // Check cooldown - don't re-notify too often
          const notifKey = `${user.id}-${room.id}`;
          const lastNotified = sentNotifications.get(notifKey);
          if (lastNotified) {
            const cooldownMs = RE_NOTIFY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
            if (Date.now() - lastNotified < cooldownMs) continue;
          }

          // Build notification data
          const authorName = latestMessage.author
            ? `${latestMessage.author.firstName || ''} ${latestMessage.author.name || ''}`.trim()
            : 'Unbekannt';

          const messagePreview = latestMessage.text
            ? latestMessage.text.substring(0, 150) + (latestMessage.text.length > 150 ? '…' : '')
            : '(Anhang)';

          const oldestUnreadDate = new Date(oldestUnread.createdAt).toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });

          const chatLink = `${frontendUrl}/chat`;

          try {
            await sendTemplateMail('chat-unread', user.email, {
              first_name: user.firstName || user.name,
              surname: user.name,
              choir: choir.name,
              room_title: room.title,
              room_key: room.key,
              unread_count: String(unreadCount),
              oldest_unread_date: oldestUnreadDate,
              last_author: authorName,
              last_message_preview: messagePreview,
              link: chatLink
            });

            sentNotifications.set(notifKey, Date.now());
            logger.info(`Chat unread notification sent to user ${user.id} for room "${room.title}" (${choir.name}): ${unreadCount} unread`);
          } catch (mailErr) {
            logger.error(`Failed to send chat unread notification to user ${user.id}: ${mailErr.message}`);
          }
        }
      }
    }
  } catch (err) {
    logger.error(`Chat unread notification check failed: ${err.message}`);
  }
}

function cleanupOldNotifications() {
  const cutoff = Date.now() - RE_NOTIFY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  for (const [key, timestamp] of sentNotifications) {
    if (timestamp < cutoff) {
      sentNotifications.delete(key);
    }
  }
  logger.debug('Chat unread notification tracking cache cleaned.');
}

let checkInterval = null;
let cleanupInterval = null;

function startScheduler() {
  if (checkInterval) return;

  logger.info(`Chat unread notification scheduler started (interval: ${CHECK_INTERVAL_MS / 3600000}h, threshold: ${UNREAD_THRESHOLD_DAYS} days)`);

  // Run first check after 1 minute (let server fully start)
  setTimeout(checkAndNotifyUnreadMessages, 60 * 1000);
  checkInterval = setInterval(checkAndNotifyUnreadMessages, CHECK_INTERVAL_MS);
  cleanupInterval = setInterval(cleanupOldNotifications, CLEANUP_INTERVAL_MS);
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
  stopScheduler,
  checkAndNotifyUnreadMessages
};
