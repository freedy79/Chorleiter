const db = require('../models');
const logger = require('../config/logger');
const { sendTemplateMail } = require('./email.service');
const { getFrontendUrl } = require('../utils/frontend-url');
const { Op } = require('sequelize');

// Check every 6 hours
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Notify after 3 days of unread messages
const UNREAD_THRESHOLD_DAYS = 3;

/**
 * Total unread messages for a user across all accessible rooms in a choir.
 * Uses 2 bulk reads + N parallel counts so it stays efficient even for many rooms.
 */
async function countTotalUnreadForUser(userId, rooms) {
  const privateRoomIds = rooms.filter(r => r.isPrivate).map(r => r.id);

  // Which private rooms is this user a member of?
  const privateMemberships = privateRoomIds.length > 0
    ? await db.chat_room_member.findAll({
        where: { chatRoomId: { [Op.in]: privateRoomIds }, userId },
        attributes: ['chatRoomId']
      })
    : [];
  const memberRoomIds = new Set(privateMemberships.map(m => m.chatRoomId));

  const accessibleRoomIds = rooms
    .filter(r => !r.isPrivate || memberRoomIds.has(r.id))
    .map(r => r.id);

  if (accessibleRoomIds.length === 0) return 0;

  // Read states for all rooms in one query
  const readStates = await db.chat_read_state.findAll({
    where: { userId, chatRoomId: { [Op.in]: accessibleRoomIds } },
    attributes: ['chatRoomId', 'lastReadMessageId']
  });
  const readMap = new Map(readStates.map(s => [s.chatRoomId, s.lastReadMessageId || 0]));

  // Count unread in all rooms in parallel
  const counts = await Promise.all(
    accessibleRoomIds.map(roomId =>
      db.chat_message.count({
        where: {
          chatRoomId: roomId,
          id: { [Op.gt]: readMap.get(roomId) || 0 },
          deletedAt: null,
          userId: { [Op.ne]: userId }
        }
      })
    )
  );

  return counts.reduce((sum, c) => sum + c, 0);
}

/**
 * Find users who have unread chat messages older than UNREAD_THRESHOLD_DAYS
 * and send them an email notification — but only if new messages have arrived
 * since the last notification (tracked via chat_read_state.lastNotifiedMessageId).
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

          // Skip if user has already read up to the latest message
          const lastReadId = readState?.lastReadMessageId || 0;
          if (lastReadId >= latestMessage.id) continue;

          // Skip if no new messages have arrived since the last notification email.
          // This prevents re-sending for the same messages after a server restart.
          const lastNotifiedId = readState?.lastNotifiedMessageId || 0;
          if (latestMessage.id <= lastNotifiedId) continue;

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

          // Build notification data
          const firstName = latestMessage.author?.firstName || '';
          const lastName = latestMessage.author?.name || '';
          const authorName = `${firstName} ${lastName}`.trim() || 'Unbekannt';
          const authorInitials = [firstName, lastName]
            .map(s => s.charAt(0).toUpperCase())
            .filter(Boolean)
            .join('') || '?';

          const fullText = latestMessage.text || '';
          const messagePreview = fullText
            ? fullText.substring(0, 150) + (fullText.length > 150 ? '…' : '')
            : '(Anhang)';
          const attachmentName = latestMessage.attachmentOriginalName || latestMessage.attachmentFilename || '';

          const oldestUnreadDate = new Date(oldestUnread.createdAt).toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });

          const lastMessageDate = new Date(latestMessage.createdAt).toLocaleString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          // Link goes directly to the specific chat room
          const chatLink = `${frontendUrl}/chat?room=${room.id}`;

          const totalUnreadCount = await countTotalUnreadForUser(user.id, choir.chatRooms);

          try {
            await sendTemplateMail('chat-unread', user.email, {
              first_name: user.firstName || user.name,
              surname: user.name,
              choir: choir.name,
              room_title: room.title,
              room_key: room.key,
              room_id: String(room.id),
              unread_count: String(unreadCount),
              oldest_unread_date: oldestUnreadDate,
              last_author: authorName,
              last_author_initials: authorInitials,
              last_message_text: fullText,
              last_message_preview: messagePreview,
              last_message_date: lastMessageDate,
              last_message_attachment_name: attachmentName,
              total_unread_count: String(totalUnreadCount),
              link: chatLink
            });

            // Persist the latest message ID so we don't re-notify for the same messages
            await db.chat_read_state.upsert({
              chatRoomId: room.id,
              userId: user.id,
              lastNotifiedMessageId: latestMessage.id
            });

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

let checkInterval = null;

function startScheduler() {
  if (checkInterval) return;

  logger.info(`Chat unread notification scheduler started (interval: ${CHECK_INTERVAL_MS / 3600000}h, threshold: ${UNREAD_THRESHOLD_DAYS} days)`);

  // Run first check after 1 minute (let server fully start)
  setTimeout(checkAndNotifyUnreadMessages, 60 * 1000);
  checkInterval = setInterval(checkAndNotifyUnreadMessages, CHECK_INTERVAL_MS);
}

function stopScheduler() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  checkAndNotifyUnreadMessages
};
