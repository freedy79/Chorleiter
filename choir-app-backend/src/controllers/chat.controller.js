const path = require('path');
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');
const { Op } = require('sequelize');

const db = require('../models');
const logger = require('../config/logger');
const pushNotificationService = require('../services/pushNotification.service');
const emailService = require('../services/email.service');

const ATTACHMENTS_DIR = path.join(__dirname, '../..', 'uploads', 'chat-attachments');
const DEFAULT_ROOM_KEY = 'allgemein';
const DEFAULT_ROOM_TITLE = '#allgemein';
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const EDIT_WINDOW_MINUTES = 15;
const RECOMMENDED_POLL_RETRY_MS = 7000;
const STREAM_POLL_INTERVAL_MS = 2500;
const STREAM_HEARTBEAT_MS = 25000;

function stripHtml(text) {
  return sanitizeHtml(text || '', {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  }).trim();
}

function toPlain(model) {
  return model?.toJSON ? model.toJSON() : model;
}

function deleteAttachmentFile(filename) {
  if (!filename) return;
  const target = path.join(ATTACHMENTS_DIR, filename);
  fs.unlink(target, () => {});
}

async function getMembership(req) {
  if (!req._chatMembership) {
    req._chatMembership = db.user_choir.findOne({
      where: { userId: req.userId, choirId: req.activeChoirId }
    });
  }

  return req._chatMembership;
}

async function ensureMemberAccess(req) {
  const membership = await getMembership(req);
  return !!membership;
}

async function isModerator(req) {
  if (Array.isArray(req.userRoles) && req.userRoles.includes('admin')) return true;

  const membership = await getMembership(req);
  const roles = membership?.rolesInChoir;
  return Array.isArray(roles) && (roles.includes('choir_admin') || roles.includes('director'));
}

function canEditWithinWindow(message) {
  const createdAt = new Date(message.createdAt);
  const editWindowEnd = new Date(createdAt.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000);
  return new Date() <= editWindowEnd;
}

function serializeMessage(message, currentUserId) {
  const plain = toPlain(message);
  const deleted = !!plain.deletedAt;

  return {
    id: plain.id,
    chatRoomId: plain.chatRoomId,
    userId: plain.userId,
    text: deleted ? null : plain.text,
    createdAt: plain.createdAt,
    editedAt: plain.editedAt,
    deletedAt: plain.deletedAt,
    deleted: deleted,
    replyToMessageId: plain.replyToMessageId,
    attachment: deleted || !plain.attachmentFilename
      ? null
      : {
          originalName: plain.attachmentOriginalName,
          mimeType: plain.attachmentMimeType,
          size: plain.attachmentSize,
          url: `/api/chat/messages/${plain.id}/attachment`
        },
    author: plain.author
      ? {
          id: plain.author.id,
          firstName: plain.author.firstName || null,
          name: plain.author.name
        }
      : null,
    isOwnMessage: plain.userId === currentUserId
  };
}

function sanitizeRoomKey(rawKey) {
  const key = String(rawKey || '').toLowerCase().trim().replace(/^#/, '');
  return key.replace(/[^a-z0-9-]/g, '').slice(0, 40);
}

function sanitizeRoomTitle(rawTitle, fallbackKey) {
  const title = stripHtml(rawTitle || '');
  if (title.length >= 2) return title.slice(0, 120);
  return `#${fallbackKey || DEFAULT_ROOM_KEY}`;
}

function normalizeMemberUserIds(rawIds) {
  if (!Array.isArray(rawIds)) return [];
  const parsed = rawIds
    .map(id => Number(id))
    .filter(id => Number.isInteger(id) && id > 0);
  return Array.from(new Set(parsed));
}

function buildMessagePreview(message) {
  if (!message || message.deletedAt) return '(gelöschte Nachricht)';
  const text = stripHtml(message.text || '');
  if (text) {
    return text.length > 140 ? `${text.slice(0, 137)}...` : text;
  }
  if (message.attachmentOriginalName) {
    return `📎 ${message.attachmentOriginalName}`;
  }
  return '(Nachricht)';
}

async function calculateAllReadUpToId(room, currentUserId) {
  let participantIds;

  if (room.isPrivate) {
    const members = await db.chat_room_member.findAll({
      where: { chatRoomId: room.id, userId: { [Op.ne]: currentUserId } },
      attributes: ['userId']
    });
    participantIds = members.map(m => m.userId);
  } else {
    const choirMembers = await db.user_choir.findAll({
      where: { choirId: room.choirId, userId: { [Op.ne]: currentUserId } },
      attributes: ['userId']
    });
    participantIds = choirMembers.map(m => m.userId);
  }

  if (participantIds.length === 0) return null;

  const readStates = await db.chat_read_state.findAll({
    where: { chatRoomId: room.id, userId: participantIds },
    attributes: ['userId', 'lastReadMessageId']
  });

  if (readStates.length < participantIds.length) return null;

  const readIds = readStates.map(s => s.lastReadMessageId).filter(id => id != null);
  if (readIds.length < participantIds.length) return null;

  return Math.min(...readIds);
}

async function ensureDefaultRoom(choirId) {
  const [room] = await db.chat_room.findOrCreate({
    where: {
      choirId,
      key: DEFAULT_ROOM_KEY
    },
    defaults: {
      choirId,
      key: DEFAULT_ROOM_KEY,
      title: DEFAULT_ROOM_TITLE,
      isDefault: true
    }
  });

  return room;
}

async function getAccessibleRoom(roomId, req) {
  const room = await db.chat_room.findByPk(roomId);
  if (!room || room.choirId !== req.activeChoirId) {
    return null;
  }

  if (!room.isPrivate) {
    return room;
  }

  if (await isModerator(req)) {
    return room;
  }

  const roomMember = await db.chat_room_member.findOne({
    where: { chatRoomId: room.id, userId: req.userId }
  });

  return roomMember ? room : null;
}

async function getAccessibleRoomsForChoir(choirId, userId, userIsPrivileged = false) {
  const rooms = await db.chat_room.findAll({
    where: { choirId },
    order: [
      ['isDefault', 'DESC'],
      ['title', 'ASC']
    ]
  });

  if (userIsPrivileged) {
    return rooms;
  }

  const privateRoomIds = rooms.filter(room => room.isPrivate).map(room => room.id);
  if (!privateRoomIds.length) {
    return rooms;
  }

  const memberships = await db.chat_room_member.findAll({
    where: {
      userId,
      chatRoomId: privateRoomIds
    },
    attributes: ['chatRoomId']
  });
  const allowedPrivate = new Set(memberships.map(entry => entry.chatRoomId));

  return rooms.filter(room => !room.isPrivate || allowedPrivate.has(room.id));
}

async function getOrCreateReadState(roomId, userId) {
  const [state] = await db.chat_read_state.findOrCreate({
    where: { chatRoomId: roomId, userId },
    defaults: {
      chatRoomId: roomId,
      userId,
      lastReadAt: null,
      lastReadMessageId: null
    }
  });

  return state;
}

async function collectUnreadInfoForRoom(room, userId, readState) {
  const since = readState?.lastReadAt || new Date(0);
  const unreadWhere = {
    chatRoomId: room.id,
    deletedAt: null,
    userId: { [Op.ne]: userId },
    createdAt: { [Op.gt]: since }
  };

  const [unreadCount, oldestUnread, newestUnread] = await Promise.all([
    db.chat_message.count({ where: unreadWhere }),
    db.chat_message.findOne({
      where: unreadWhere,
      include: [{ model: db.user, as: 'author', attributes: ['id', 'firstName', 'name'] }],
      order: [['createdAt', 'ASC']]
    }),
    db.chat_message.findOne({
      where: unreadWhere,
      include: [{ model: db.user, as: 'author', attributes: ['id', 'firstName', 'name'] }],
      order: [['createdAt', 'DESC']]
    })
  ]);

  return {
    unreadCount,
    oldestUnread,
    newestUnread
  };
}

exports.getRooms = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Räume.' });
  }

  await ensureDefaultRoom(req.activeChoirId);

  const moderator = await isModerator(req);
  const rooms = await getAccessibleRoomsForChoir(req.activeChoirId, req.userId, moderator);

  const readStates = await db.chat_read_state.findAll({
    where: {
      userId: req.userId,
      chatRoomId: rooms.map(room => room.id)
    }
  });
  const readStateByRoomId = new Map(readStates.map(state => [state.chatRoomId, state]));

  const roomPayload = await Promise.all(
    rooms.map(async room => {
      const readState = readStateByRoomId.get(room.id);
      const unreadSince = readState?.lastReadAt || new Date(0);

      const [unreadCount, lastMessage] = await Promise.all([
        db.chat_message.count({
          where: {
            chatRoomId: room.id,
            deletedAt: null,
            userId: { [Op.ne]: req.userId },
            createdAt: { [Op.gt]: unreadSince }
          }
        }),
        db.chat_message.findOne({
          where: { chatRoomId: room.id },
          order: [['createdAt', 'DESC']]
        })
      ]);

      return {
        id: room.id,
        choirId: room.choirId,
        key: room.key,
        title: room.title,
        isPrivate: !!room.isPrivate,
        isDefault: room.isDefault,
        canManage: moderator,
        unreadCount,
        lastReadAt: readState?.lastReadAt || null,
        lastReadMessageId: readState?.lastReadMessageId || null,
        lastMessageAt: lastMessage?.createdAt || null
      };
    })
  );

  res.status(200).send(roomPayload);
};

exports.getRoomDetail = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Räume.' });
  }

  const roomId = Number(req.params.roomId);
  const room = await db.chat_room.findByPk(roomId);
  if (!room || room.choirId !== req.activeChoirId) {
    return res.status(404).send({ message: 'Raum nicht gefunden.' });
  }

  const memberRows = await db.chat_room_member.findAll({
    where: { chatRoomId: room.id },
    attributes: ['userId']
  });

  const memberUserIds = memberRows.map(item => item.userId);

  res.status(200).send({
    id: room.id,
    choirId: room.choirId,
    key: room.key,
    title: room.title,
    isPrivate: !!room.isPrivate,
    isDefault: !!room.isDefault,
    memberUserIds
  });
};

exports.createRoom = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Räume.' });
  }

  const key = sanitizeRoomKey(req.body.key || req.body.title || '');
  if (!key || key.length < 2) {
    return res.status(400).send({ message: 'Ungültiger Raum-Key.' });
  }

  const existing = await db.chat_room.findOne({
    where: {
      choirId: req.activeChoirId,
      key
    }
  });

  if (existing) {
    return res.status(409).send({ message: 'Raum existiert bereits.' });
  }

  const requestedMemberIds = normalizeMemberUserIds(req.body.memberUserIds);
  const wantsPrivate = req.body.isPrivate === true || requestedMemberIds.length > 0;

  if (wantsPrivate && requestedMemberIds.length === 0) {
    return res.status(400).send({ message: 'Private Räume benötigen mindestens ein Mitglied.' });
  }

  if (requestedMemberIds.length > 0) {
    const choirMembers = await db.user_choir.findAll({
      where: {
        choirId: req.activeChoirId,
        userId: requestedMemberIds
      },
      attributes: ['userId']
    });
    const validMemberIds = new Set(choirMembers.map(member => member.userId));
    const invalidMemberIds = requestedMemberIds.filter(id => !validMemberIds.has(id));
    if (invalidMemberIds.length > 0) {
      return res.status(400).send({
        message: 'Einige Mitglieder gehören nicht zum aktiven Chor.',
        invalidMemberIds
      });
    }
  }

  const room = await db.chat_room.create({
    choirId: req.activeChoirId,
    key,
    title: sanitizeRoomTitle(req.body.title, key),
    isPrivate: wantsPrivate,
    isDefault: false
  });

  if (wantsPrivate) {
    const memberIds = Array.from(new Set([req.userId, ...requestedMemberIds]));
    if (memberIds.length > 0) {
      await db.chat_room_member.bulkCreate(
        memberIds.map(userId => ({ chatRoomId: room.id, userId, role: 'member' }))
      );
    }
  }

  res.status(201).send({
    ...toPlain(room),
    memberUserIds: wantsPrivate ? Array.from(new Set([req.userId, ...requestedMemberIds])) : []
  });
};

exports.updateRoom = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Räume.' });
  }

  const roomId = Number(req.params.roomId);
  const room = await db.chat_room.findByPk(roomId);
  if (!room || room.choirId !== req.activeChoirId) {
    return res.status(404).send({ message: 'Raum nicht gefunden.' });
  }

  const requestedMemberIds = normalizeMemberUserIds(req.body.memberUserIds);
  const wantsPrivate = req.body.isPrivate === true || requestedMemberIds.length > 0;

  if (room.isDefault && wantsPrivate) {
    return res.status(400).send({ message: 'Der Standardraum darf nicht privat sein.' });
  }

  if (wantsPrivate && requestedMemberIds.length === 0) {
    return res.status(400).send({ message: 'Private Räume benötigen mindestens ein Mitglied.' });
  }

  if (requestedMemberIds.length > 0) {
    const choirMembers = await db.user_choir.findAll({
      where: {
        choirId: req.activeChoirId,
        userId: requestedMemberIds
      },
      attributes: ['userId']
    });
    const validMemberIds = new Set(choirMembers.map(member => member.userId));
    const invalidMemberIds = requestedMemberIds.filter(id => !validMemberIds.has(id));
    if (invalidMemberIds.length > 0) {
      return res.status(400).send({
        message: 'Einige Mitglieder gehören nicht zum aktiven Chor.',
        invalidMemberIds
      });
    }
  }

  const newTitle = typeof req.body.title === 'string'
    ? sanitizeRoomTitle(req.body.title, room.key)
    : room.title;

  await db.sequelize.transaction(async transaction => {
    await room.update({
      title: newTitle,
      isPrivate: wantsPrivate
    }, { transaction });

    if (!wantsPrivate) {
      await db.chat_room_member.destroy({
        where: { chatRoomId: room.id },
        transaction
      });
      return;
    }

    const memberIds = Array.from(new Set([req.userId, ...requestedMemberIds]));
    await db.chat_room_member.destroy({
      where: { chatRoomId: room.id },
      transaction
    });
    await db.chat_room_member.bulkCreate(
      memberIds.map(userId => ({ chatRoomId: room.id, userId, role: 'member' })),
      { transaction }
    );
  });

  const memberRows = await db.chat_room_member.findAll({
    where: { chatRoomId: room.id },
    attributes: ['userId']
  });

  res.status(200).send({
    ...toPlain(room),
    memberUserIds: memberRows.map(item => item.userId)
  });
};

exports.getRoomMessages = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Nachrichten.' });
  }

  const roomId = Number(req.params.roomId);
  const room = await getAccessibleRoom(roomId, req);
  if (!room) {
    return res.status(404).send({ message: 'Raum nicht gefunden.' });
  }

  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const where = { chatRoomId: room.id };

  if (req.query.before) {
    where.createdAt = { ...(where.createdAt || {}), [Op.lt]: new Date(req.query.before) };
  }

  if (req.query.after) {
    where.createdAt = { ...(where.createdAt || {}), [Op.gt]: new Date(req.query.after) };
  }

  if (req.query.afterId) {
    where.id = { ...(where.id || {}), [Op.gt]: Number(req.query.afterId) };
  }

  const messages = await db.chat_message.findAll({
    where,
    include: [{ model: db.user, as: 'author', attributes: ['id', 'firstName', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit
  });

  const ordered = [...messages].reverse();
  const lastMessageId = ordered.length > 0 ? ordered[ordered.length - 1].id : null;
  const allReadUpToId = await calculateAllReadUpToId(room, req.userId);

  res.status(200).send({
    room: {
      id: room.id,
      key: room.key,
      title: room.title,
      isPrivate: !!room.isPrivate,
      isDefault: room.isDefault
    },
    messages: ordered.map(message => serializeMessage(message, req.userId)),
    allReadUpToId,
    realtime: {
      transport: 'polling',
      supportsCursor: true,
      cursorType: 'afterId',
      recommendedRetryMs: RECOMMENDED_POLL_RETRY_MS
    },
    cursor: {
      lastMessageId,
      serverTime: new Date().toISOString()
    }
  });
};

exports.createMessage = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    if (req.file?.filename) deleteAttachmentFile(req.file.filename);
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Nachrichten.' });
  }

  const roomId = Number(req.params.roomId);
  const room = await getAccessibleRoom(roomId, req);
  if (!room) {
    if (req.file?.filename) deleteAttachmentFile(req.file.filename);
    return res.status(404).send({ message: 'Raum nicht gefunden.' });
  }

  const text = stripHtml(req.body.text || '');
  const replyToMessageId = req.body.replyToMessageId ? Number(req.body.replyToMessageId) : null;
  const hasAttachment = !!req.file;

  if (!text && !hasAttachment) {
    if (req.file?.filename) deleteAttachmentFile(req.file.filename);
    return res.status(400).send({ message: 'Nachrichtentext oder Anhang erforderlich.' });
  }

  let replyTarget = null;
  if (replyToMessageId) {
    replyTarget = await db.chat_message.findByPk(replyToMessageId);
    if (!replyTarget || replyTarget.chatRoomId !== room.id) {
      if (req.file?.filename) deleteAttachmentFile(req.file.filename);
      return res.status(404).send({ message: 'Antwortziel nicht gefunden.' });
    }
    if (replyTarget.replyToMessageId) {
      if (req.file?.filename) deleteAttachmentFile(req.file.filename);
      return res.status(400).send({ message: 'Nur eine Antwortebene ist erlaubt.' });
    }
  }

  const created = await db.chat_message.create({
    chatRoomId: room.id,
    userId: req.userId,
    text,
    replyToMessageId: replyTarget ? replyTarget.id : null,
    attachmentFilename: req.file?.filename || null,
    attachmentOriginalName: req.file?.originalname || null,
    attachmentMimeType: req.file?.mimetype || null,
    attachmentSize: req.file?.size || null
  });

  const fullMessage = await db.chat_message.findByPk(created.id, {
    include: [{ model: db.user, as: 'author', attributes: ['id', 'firstName', 'name'] }]
  });

  const choir = await db.choir.findByPk(req.activeChoirId, { attributes: ['name'] });
  const sender = await db.user.findByPk(req.userId, { attributes: ['firstName', 'name'] });
  const senderName = sender ? `${sender.firstName || ''} ${sender.name || ''}`.trim() : '';
  const choirName = choir?.name || 'Dein Chor';
  const messagePreview = text
    ? (text.length > 100 ? text.substring(0, 100) + '…' : text)
    : `📎 ${req.file?.originalname || 'Anhang'}`;
  const url = `/chat?room=${room.id}&message=${created.id}`;
  const payload = {
    title: `${choirName} – ${senderName}`,
    body: messagePreview,
    tag: `chat-room-${room.id}`,
    renotify: true,
    url,
    data: { url }
  };

  if (room.isPrivate) {
    const memberRows = await db.chat_room_member.findAll({
      where: { chatRoomId: room.id },
      attributes: ['userId']
    });
    const memberUserIds = memberRows.map(item => item.userId);
    pushNotificationService
      .sendToUsersInChoir(req.activeChoirId, memberUserIds, payload, req.userId)
      .catch(err => logger.warn(`Private chat push failed: ${err.message}`));
  } else {
    pushNotificationService
      .sendToChoirMembers(req.activeChoirId, payload, req.userId)
      .catch(err => logger.warn(`Chat push failed: ${err.message}`));
  }

  res.status(201).send(serializeMessage(fullMessage, req.userId));
};

exports.updateMessage = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Nachrichten.' });
  }

  const messageId = Number(req.params.id);
  const message = await db.chat_message.findByPk(messageId);
  if (!message) {
    return res.status(404).send({ message: 'Nachricht nicht gefunden.' });
  }

  const room = await getAccessibleRoom(message.chatRoomId, req);
  if (!room) {
    return res.status(404).send({ message: 'Nachricht nicht gefunden.' });
  }

  const moderator = await isModerator(req);
  const ownMessage = message.userId === req.userId;
  if (!moderator && !ownMessage) {
    return res.status(403).send({ message: 'Nicht erlaubt.' });
  }

  if (!moderator && !canEditWithinWindow(message)) {
    return res.status(403).send({ message: `Bearbeiten nur innerhalb von ${EDIT_WINDOW_MINUTES} Minuten möglich.` });
  }

  if (message.deletedAt) {
    return res.status(400).send({ message: 'Gelöschte Nachrichten können nicht bearbeitet werden.' });
  }

  const text = stripHtml(req.body.text || '');
  if (!text) {
    return res.status(400).send({ message: 'Text erforderlich.' });
  }

  await message.update({
    text,
    editedAt: new Date()
  });

  const full = await db.chat_message.findByPk(message.id, {
    include: [{ model: db.user, as: 'author', attributes: ['id', 'firstName', 'name'] }]
  });

  res.status(200).send(serializeMessage(full, req.userId));
};

exports.deleteMessage = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Nachrichten.' });
  }

  const messageId = Number(req.params.id);
  const message = await db.chat_message.findByPk(messageId);
  if (!message) {
    return res.status(404).send({ message: 'Nachricht nicht gefunden.' });
  }

  const room = await getAccessibleRoom(message.chatRoomId, req);
  if (!room) {
    return res.status(404).send({ message: 'Nachricht nicht gefunden.' });
  }

  const moderator = await isModerator(req);
  const ownMessage = message.userId === req.userId;
  if (!moderator && !ownMessage) {
    return res.status(403).send({ message: 'Nicht erlaubt.' });
  }

  deleteAttachmentFile(message.attachmentFilename);

  await message.update({
    text: '',
    editedAt: message.editedAt || new Date(),
    deletedAt: new Date(),
    attachmentFilename: null,
    attachmentOriginalName: null,
    attachmentMimeType: null,
    attachmentSize: null
  });

  res.status(204).send();
};

exports.markRoomRead = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Räume.' });
  }

  const roomId = Number(req.params.roomId);
  const room = await getAccessibleRoom(roomId, req);
  if (!room) {
    return res.status(404).send({ message: 'Raum nicht gefunden.' });
  }

  const state = await getOrCreateReadState(room.id, req.userId);

  let targetMessage = null;
  if (req.body.lastReadMessageId) {
    targetMessage = await db.chat_message.findByPk(Number(req.body.lastReadMessageId));
    if (!targetMessage || targetMessage.chatRoomId !== room.id) {
      return res.status(404).send({ message: 'Nachricht nicht gefunden.' });
    }
  } else {
    targetMessage = await db.chat_message.findOne({
      where: { chatRoomId: room.id },
      order: [['createdAt', 'DESC']]
    });
  }

  await state.update({
    lastReadMessageId: targetMessage?.id || null,
    lastReadAt: targetMessage?.createdAt || new Date()
  });

  res.status(200).send({
    chatRoomId: room.id,
    lastReadMessageId: state.lastReadMessageId,
    lastReadAt: state.lastReadAt
  });
};

exports.getUnreadSummary = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Räume.' });
  }

  await ensureDefaultRoom(req.activeChoirId);

  const rooms = await getAccessibleRoomsForChoir(req.activeChoirId, req.userId, await isModerator(req));

  const readStates = await db.chat_read_state.findAll({
    where: {
      userId: req.userId,
      chatRoomId: rooms.map(room => room.id)
    }
  });
  const readStateByRoomId = new Map(readStates.map(state => [state.chatRoomId, state]));

  const byRoom = [];
  let totalUnread = 0;
  let oldestUnread = null;
  let newestUnread = null;

  const unreadByRoom = await Promise.all(
    rooms.map(async room => ({
      room,
      unreadInfo: await collectUnreadInfoForRoom(room, req.userId, readStateByRoomId.get(room.id))
    }))
  );

  for (const { room, unreadInfo } of unreadByRoom) {

    totalUnread += unreadInfo.unreadCount;

    if (unreadInfo.oldestUnread) {
      const item = {
        chatRoomId: room.id,
        key: room.key,
        title: room.title,
        messageId: unreadInfo.oldestUnread.id,
        createdAt: unreadInfo.oldestUnread.createdAt,
        preview: buildMessagePreview(unreadInfo.oldestUnread),
        authorName: unreadInfo.oldestUnread.author?.name || null
      };
      if (!oldestUnread || new Date(item.createdAt) < new Date(oldestUnread.createdAt)) {
        oldestUnread = item;
      }
    }

    if (unreadInfo.newestUnread) {
      const item = {
        chatRoomId: room.id,
        key: room.key,
        title: room.title,
        messageId: unreadInfo.newestUnread.id,
        createdAt: unreadInfo.newestUnread.createdAt,
        preview: buildMessagePreview(unreadInfo.newestUnread),
        authorName: unreadInfo.newestUnread.author?.name || null
      };
      if (!newestUnread || new Date(item.createdAt) > new Date(newestUnread.createdAt)) {
        newestUnread = item;
      }
    }

    byRoom.push({
      chatRoomId: room.id,
      key: room.key,
      title: room.title,
      unreadCount: unreadInfo.unreadCount,
      oldestUnreadMessageId: unreadInfo.oldestUnread?.id || null,
      newestUnread: unreadInfo.newestUnread
        ? {
            messageId: unreadInfo.newestUnread.id,
            createdAt: unreadInfo.newestUnread.createdAt,
            preview: buildMessagePreview(unreadInfo.newestUnread),
            authorName: unreadInfo.newestUnread.author?.name || null
          }
        : null
    });
  }

  res.status(200).send({
    totalUnread,
    rooms: byRoom,
    oldestUnread,
    newestUnread
  });
};

exports.getGlobalUnreadOverview = async (req, res) => {
  const memberships = await db.user_choir.findAll({
    where: { userId: req.userId },
    attributes: ['choirId']
  });

  const choirIds = Array.from(new Set(memberships.map(item => item.choirId).filter(Boolean)));
  if (choirIds.length === 0) {
    return res.status(200).send({ totalUnread: 0, choirs: [], oldestUnread: null, newestUnread: null });
  }

  const choirRows = await db.choir.findAll({
    where: { id: choirIds },
    attributes: ['id', 'name']
  });
  const choirNameById = new Map(choirRows.map(choir => [choir.id, choir.name]));

  const allRooms = await db.chat_room.findAll({
    where: { choirId: choirIds },
    order: [
      ['isDefault', 'DESC'],
      ['title', 'ASC']
    ]
  });

  const privateRoomIds = allRooms.filter(room => room.isPrivate).map(room => room.id);
  const privateMemberships = privateRoomIds.length > 0
    ? await db.chat_room_member.findAll({
        where: {
          userId: req.userId,
          chatRoomId: privateRoomIds
        },
        attributes: ['chatRoomId']
      })
    : [];
  const allowedPrivate = new Set(privateMemberships.map(item => item.chatRoomId));
  const accessibleRooms = allRooms.filter(room => !room.isPrivate || allowedPrivate.has(room.id));

  const readStates = await db.chat_read_state.findAll({
    where: {
      userId: req.userId,
      chatRoomId: accessibleRooms.map(room => room.id)
    }
  });
  const readStateByRoomId = new Map(readStates.map(state => [state.chatRoomId, state]));

  const choirMap = new Map();
  let totalUnread = 0;
  let oldestUnread = null;
  let newestUnread = null;

  const unreadByRoom = await Promise.all(
    accessibleRooms.map(async room => ({
      room,
      unreadInfo: await collectUnreadInfoForRoom(room, req.userId, readStateByRoomId.get(room.id))
    }))
  );

  for (const { room, unreadInfo } of unreadByRoom) {
    totalUnread += unreadInfo.unreadCount;

    const choirId = room.choirId;
    if (!choirMap.has(choirId)) {
      choirMap.set(choirId, {
        choirId,
        choirName: choirNameById.get(choirId) || null,
        totalUnread: 0,
        rooms: []
      });
    }

    const choirEntry = choirMap.get(choirId);
    choirEntry.totalUnread += unreadInfo.unreadCount;
    choirEntry.rooms.push({
      chatRoomId: room.id,
      key: room.key,
      title: room.title,
      unreadCount: unreadInfo.unreadCount
    });

    if (unreadInfo.oldestUnread) {
      const item = {
        choirId,
        choirName: choirNameById.get(choirId) || null,
        chatRoomId: room.id,
        roomTitle: room.title,
        messageId: unreadInfo.oldestUnread.id,
        createdAt: unreadInfo.oldestUnread.createdAt,
        preview: buildMessagePreview(unreadInfo.oldestUnread),
        authorName: unreadInfo.oldestUnread.author?.name || null
      };
      if (!oldestUnread || new Date(item.createdAt) < new Date(oldestUnread.createdAt)) {
        oldestUnread = item;
      }
    }

    if (unreadInfo.newestUnread) {
      const item = {
        choirId,
        choirName: choirNameById.get(choirId) || null,
        chatRoomId: room.id,
        roomTitle: room.title,
        messageId: unreadInfo.newestUnread.id,
        createdAt: unreadInfo.newestUnread.createdAt,
        preview: buildMessagePreview(unreadInfo.newestUnread),
        authorName: unreadInfo.newestUnread.author?.name || null
      };
      if (!newestUnread || new Date(item.createdAt) > new Date(newestUnread.createdAt)) {
        newestUnread = item;
      }
    }
  }

  res.status(200).send({
    totalUnread,
    choirs: Array.from(choirMap.values()).sort((a, b) =>
      String(a.choirName || '').localeCompare(String(b.choirName || ''), 'de')
    ),
    oldestUnread,
    newestUnread
  });
};

exports.getMessageById = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Nachrichten.' });
  }

  const messageId = Number(req.params.id);
  const message = await db.chat_message.findByPk(messageId, {
    include: [{ model: db.user, as: 'author', attributes: ['id', 'firstName', 'name'] }]
  });
  if (!message) {
    return res.status(404).send({ message: 'Nachricht nicht gefunden.' });
  }

  const room = await getAccessibleRoom(message.chatRoomId, req);
  if (!room) {
    return res.status(404).send({ message: 'Nachricht nicht gefunden.' });
  }

  res.status(200).send({
    ...serializeMessage(message, req.userId),
    room: {
      id: room.id,
      key: room.key,
      title: room.title,
      isPrivate: !!room.isPrivate
    }
  });
};

exports.downloadAttachment = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Nachrichten.' });
  }

  const messageId = Number(req.params.id);
  const message = await db.chat_message.findByPk(messageId);
  if (!message || !message.attachmentFilename || message.deletedAt) {
    return res.status(404).send({ message: 'Anhang nicht gefunden.' });
  }

  const room = await getAccessibleRoom(message.chatRoomId, req);
  if (!room) {
    return res.status(404).send({ message: 'Anhang nicht gefunden.' });
  }

  const filePath = path.join(ATTACHMENTS_DIR, message.attachmentFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ message: 'Datei nicht gefunden.' });
  }

  return res.download(filePath, message.attachmentOriginalName || message.attachmentFilename);
};

exports.streamRoomEvents = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff auf Chat-Nachrichten.' });
  }

  const roomId = Number(req.params.roomId);
  const room = await getAccessibleRoom(roomId, req);
  if (!room) {
    return res.status(404).send({ message: 'Raum nicht gefunden.' });
  }

  let cursorId = Number(req.query.afterId) || Number(req.get('last-event-id')) || 0;
  if (Number.isNaN(cursorId) || cursorId < 0) cursorId = 0;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const sendEvent = (eventName, payload, id) => {
    if (id !== undefined && id !== null) {
      res.write(`id: ${id}\n`);
    }
    if (eventName) {
      res.write(`event: ${eventName}\n`);
    }
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  res.write(`retry: ${RECOMMENDED_POLL_RETRY_MS}\n\n`);
  sendEvent('meta', {
    roomId: room.id,
    transport: 'sse',
    cursorType: 'afterId',
    serverTime: new Date().toISOString()
  });

  const pollForNewMessages = async () => {
    const newMessages = await db.chat_message.findAll({
      where: {
        chatRoomId: room.id,
        id: { [Op.gt]: cursorId }
      },
      include: [{ model: db.user, as: 'author', attributes: ['id', 'firstName', 'name'] }],
      order: [['id', 'ASC']],
      limit: MAX_LIMIT
    });

    if (!Array.isArray(newMessages) || newMessages.length === 0) {
      return;
    }

    for (const message of newMessages) {
      const serialized = serializeMessage(message, req.userId);
      cursorId = Math.max(cursorId, serialized.id);
      sendEvent('message', serialized, serialized.id);
    }
  };

  const pollingTimer = setInterval(() => {
    pollForNewMessages().catch(err => {
      logger.warn(`Chat SSE poll failed: ${err.message}`);
      sendEvent('error', { message: 'stream_poll_failed' });
    });
  }, STREAM_POLL_INTERVAL_MS);

  const heartbeatTimer = setInterval(() => {
    calculateAllReadUpToId(room, req.userId).then(allReadUpToId => {
      sendEvent('heartbeat', { ts: new Date().toISOString(), cursorId, allReadUpToId });
    }).catch(() => {
      sendEvent('heartbeat', { ts: new Date().toISOString(), cursorId, allReadUpToId: null });
    });
  }, STREAM_HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(pollingTimer);
    clearInterval(heartbeatTimer);
    res.end();
  });
};

exports.reportMessage = async (req, res) => {
  if (!req.activeChoirId || !(await ensureMemberAccess(req))) {
    return res.status(403).send({ message: 'Kein Zugriff.' });
  }

  const messageId = Number(req.params.id);
  const { reason } = req.body || {};

  if (!reason || !reason.trim()) {
    return res.status(400).send({ message: 'Bitte einen Meldegrund angeben.' });
  }

  const message = await db.chat_message.findByPk(messageId, {
    include: [
      { model: db.user, as: 'author', attributes: ['id', 'firstName', 'name', 'email'] },
      {
        model: db.chat_room, as: 'room',
        attributes: ['id', 'key', 'title', 'choirId'],
        include: [{ model: db.choir, as: 'choir', attributes: ['id', 'name'] }]
      }
    ]
  });

  if (!message) {
    return res.status(404).send({ message: 'Nachricht nicht gefunden.' });
  }

  if (message.deleted || message.deletedAt) {
    return res.status(400).send({ message: 'Gelöschte Nachrichten können nicht gemeldet werden.' });
  }

  // Prevent self-reporting
  if (message.userId === req.userId) {
    return res.status(400).send({ message: 'Eigene Nachrichten können nicht gemeldet werden.' });
  }

  // Check for duplicate reports by same user on same message
  const existingReport = await db.chat_message_report.findOne({
    where: { chatMessageId: messageId, reporterUserId: req.userId, status: 'pending' }
  });
  if (existingReport) {
    return res.status(409).send({ message: 'Du hast diese Nachricht bereits gemeldet.' });
  }

  const reporter = await db.user.findByPk(req.userId, { attributes: ['id', 'name', 'email'] });

  const report = await db.chat_message_report.create({
    chatMessageId: messageId,
    reporterUserId: req.userId,
    reason: reason.trim()
  });

  // Send email to choir directors and admins
  try {
    const choirId = message.room?.choirId;
    const choirName = message.room?.choir?.name || 'Unbekannter Chor';
    const roomTitle = message.room?.title || 'Unbekannt';
    const authorName = message.author?.name || 'Unbekannt';
    const reporterName = reporter?.name || 'Unbekannt';
    const messageText = message.text || '(Nachricht ohne Text)';
    const messageDate = message.createdAt;

    await emailService.sendChatMessageReportMail({
      choirId,
      choirName,
      roomTitle,
      authorName,
      messageText,
      reason: reason.trim(),
      messageDate,
      reporterName,
      messageId: message.id,
      roomId: message.room?.id
    });
  } catch (err) {
    logger.error(`Failed to send chat message report email: ${err.message}`);
  }

  res.status(201).send({
    id: report.id,
    message: 'Nachricht wurde gemeldet.'
  });
};
