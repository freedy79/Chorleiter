const db = require('../models');
const Post = db.post;
const emailService = require('../services/email.service');
const pushNotificationService = require('../services/pushNotification.service');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');
const { getFrontendUrl } = require('../utils/frontend-url');

const ATTACHMENTS_DIR = path.join(__dirname, '../..', 'uploads', 'post-attachments');
const IMAGES_DIR = path.join(__dirname, '../..', 'uploads', 'post-images');
const MAX_IMAGES_PER_POST = 5;
const REMINDER_TOKEN_EXPIRY_HOURS = 72;

const REACTION_TYPES = ['like', 'celebrate', 'support', 'love', 'insightful', 'curious'];

function stripHtml(text) {
  // Use sanitize-html to safely remove all HTML tags
  return sanitizeHtml(text || '', {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  });
}

async function isChoirAdmin(req) {
  if (req.userRoles.includes('admin')) return true;
  const assoc = await db.user_choir.findOne({ where: { userId: req.userId, choirId: req.activeChoirId } });
  return assoc && Array.isArray(assoc.rolesInChoir) && assoc.rolesInChoir.includes('choir_admin');
}

function hashReminderToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function createReminderToken() {
  return crypto.randomBytes(32).toString('hex');
}

function setAuthCookie(res, token, rememberMe = true) {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
  res.cookie('auth-token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge,
    path: '/'
  });
}

async function loadPostWithPoll(postId) {
  return Post.findByPk(postId, {
    include: [
      { model: db.choir, as: 'choir', attributes: ['id', 'name'] },
      {
        model: db.poll,
        as: 'poll',
        include: [{ model: db.poll_option, as: 'options' }]
      }
    ]
  });
}

async function getSingerMembers(choirId) {
  const memberships = await db.user_choir.findAll({
    where: { choirId, registrationStatus: 'REGISTERED' },
    include: [{ model: db.user, attributes: ['id', 'firstName', 'name', 'email'] }]
  });

  return memberships
    .filter(m => Array.isArray(m.rolesInChoir) && m.rolesInChoir.includes('singer') && m.user)
    .map(m => ({
      id: m.user.id,
      firstName: m.user.firstName,
      name: m.user.name,
      email: m.user.email
    }));
}

async function getVoteCountByUserId(pollId) {
  const rows = await db.poll_vote.findAll({
    where: { pollId },
    attributes: [
      'userId',
      [db.sequelize.fn('COUNT', db.sequelize.col('pollOptionId')), 'voteCount']
    ],
    group: ['userId'],
    raw: true
  });

  return new Map(rows.map(row => [Number(row.userId), Number(row.voteCount || 0)]));
}

async function getLastReminderByUserId(pollId) {
  const rows = await db.poll_vote_reminder_token.findAll({
    where: { pollId },
    attributes: [
      'userId',
      [db.sequelize.fn('MAX', db.sequelize.col('sentAt')), 'lastReminderSentAt']
    ],
    group: ['userId'],
    raw: true
  });

  return new Map(rows.map(row => [Number(row.userId), row.lastReminderSentAt || null]));
}

async function buildPollReminderStatus(post, req) {
  const singers = await getSingerMembers(req.activeChoirId);
  const voteCountByUserId = await getVoteCountByUserId(post.poll.id);
  const reminderByUserId = await getLastReminderByUserId(post.poll.id);

  const members = singers.map(member => {
    const voteCount = voteCountByUserId.get(member.id) || 0;
    return {
      userId: member.id,
      firstName: member.firstName || '',
      name: member.name || '',
      email: member.email || '',
      voteCount,
      hasVoted: voteCount > 0,
      status: voteCount > 0 ? 'abgegeben' : 'offen',
      lastReminderSentAt: reminderByUserId.get(member.id) || null
    };
  });

  const pendingCount = members.filter(member => member.voteCount === 0).length;

  return {
    postId: post.id,
    pollId: post.poll.id,
    allowMultiple: !!post.poll.allowMultiple,
    maxSelections: post.poll.maxSelections || 1,
    totalSingerCount: members.length,
    pendingCount,
    members
  };
}

async function buildSigninResponse(userId, activeChoirId, accessToken) {
  const user = await db.user.findByPk(userId, {
    include: [{ model: db.choir, attributes: ['id', 'name'] }]
  });

  if (!user) return null;

  const activeChoir = user.choirs?.find(choir => choir.id === activeChoirId)
    || await db.choir.findByPk(activeChoirId, { attributes: ['id', 'name'] });

  return {
    id: user.id,
    firstName: user.firstName,
    name: user.name,
    email: user.email,
    phone: user.phone,
    voice: user.voice,
    roles: user.roles,
    helpShown: user.helpShown,
    accessToken,
    activeChoir,
    availableChoirs: user.choirs || []
  };
}

function summarizeReactions(reactions, currentUserId) {
  const reactionList = Array.isArray(reactions) ? reactions : [];
  const uniqueReactions = [];
  const seen = new Set();
  for (const reaction of reactionList) {
    if (reaction && !seen.has(reaction.id)) {
      seen.add(reaction.id);
      uniqueReactions.push(reaction);
    }
  }
  const summary = REACTION_TYPES
    .map(type => ({ type, count: uniqueReactions.filter(r => r.type === type).length }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count || REACTION_TYPES.indexOf(a.type) - REACTION_TYPES.indexOf(b.type));
  const userReaction = uniqueReactions.find(r => r.userId === currentUserId)?.type || null;
  return { summary, total: uniqueReactions.length, userReaction };
}

function serializeComment(comment, currentUserId) {
  if (!comment) return null;
  const plain = comment.toJSON ? comment.toJSON() : comment;
  const replyList = Array.isArray(plain.replies) ? plain.replies : [];
  const seenReplies = new Set();
  const replies = replyList
    .filter(reply => {
      if (!reply || seenReplies.has(reply.id)) return false;
      seenReplies.add(reply.id);
      return true;
    })
    .map(reply => serializeComment(reply, currentUserId))
    .filter(Boolean)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return {
    id: plain.id,
    text: plain.text,
    postId: plain.postId,
    choirId: plain.choirId,
    parentId: plain.parentId,
    userId: plain.userId,
    author: plain.author,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    reactions: summarizeReactions(plain.reactions, currentUserId),
    replies
  };
}

const postReactionInclude = {
  association: db.post.associations.reactions,
  attributes: ['id', 'type', 'userId']
};

const createCommentReactionInclude = () => ({
  association: db.post_comment.associations.reactions,
  attributes: ['id', 'type', 'userId'],
  required: false
});

const commentInclude = {
  model: db.post_comment,
  as: 'comments',
  where: { parentId: null },
  required: false,
  include: [
    { model: db.user, as: 'author', attributes: ['id','name'] },
    createCommentReactionInclude(),
    {
      model: db.post_comment,
      as: 'replies',
      required: false,
      include: [
        { model: db.user, as: 'author', attributes: ['id','name'] },
        createCommentReactionInclude()
      ]
    }
  ]
};

const authorInclude = { model: db.user, as: 'author', attributes: ['id','name'] };

function sanitizePollPayload(poll) {
  if (!poll) return null;
  const options = Array.isArray(poll.options)
    ? poll.options.map(o => stripHtml(String(o || '').trim())).filter(Boolean)
    : [];
  if (options.length < 2) return null;
  const allowMultiple = !!poll.allowMultiple;
  const maxSelections = allowMultiple
    ? Math.max(1, Math.min(Number(poll.maxSelections) || options.length, options.length))
    : 1;
  const closesAt = poll.closesAt ? new Date(poll.closesAt) : null;
  const validClosesAt = closesAt && !isNaN(closesAt.getTime()) ? closesAt : null;
  const isAnonymous = poll.isAnonymous !== undefined ? !!poll.isAnonymous : true;
  return { allowMultiple, maxSelections, closesAt: validClosesAt, isAnonymous, options };
}

const pollInclude = {
  model: db.poll,
  as: 'poll',
  include: [
    {
      model: db.poll_option,
      as: 'options',
      include: [{ model: db.poll_vote, as: 'votes', attributes: ['userId'], include: [{ model: db.user, as: 'user', attributes: ['id', 'name', 'firstName'] }] }]
    }
  ]
};

const imageInclude = {
  model: db.post_image,
  as: 'images',
  attributes: ['id', 'filename', 'originalName', 'mimeType', 'size', 'position', 'publicToken'],
  required: false
};

const postIncludes = [authorInclude, pollInclude, postReactionInclude, commentInclude, imageInclude];

function formatPoll(poll, currentUserId, { isAdmin = false } = {}) {
  if (!poll) return null;
  const options = [...(poll.options || [])].sort((a, b) => a.position - b.position);
  const totalVotes = options.reduce((sum, option) => sum + (option.votes ? option.votes.length : 0), 0);
  const isAnonymous = poll.isAnonymous !== false;
  // Show voter names if poll is public (non-anonymous) OR if user is admin
  const showVoters = !isAnonymous || isAdmin;
  return {
    id: poll.id,
    allowMultiple: !!poll.allowMultiple,
    maxSelections: poll.maxSelections || 1,
    closesAt: poll.closesAt,
    isAnonymous,
    totalVotes,
    options: options.map(option => {
      const result = {
        id: option.id,
        label: option.label,
        position: option.position,
        votes: option.votes ? option.votes.length : 0,
        selected: option.votes ? option.votes.some(v => v.userId === currentUserId) : false
      };
      if (showVoters && option.votes) {
        result.voters = option.votes.map(v => ({
          id: v.userId,
          name: v.user ? v.user.name : 'Unbekannt',
          firstName: v.user ? v.user.firstName : null
        }));
      }
      return result;
    })
  };
}

function serializePost(post, currentUserId, { isAdmin = false } = {}) {
  if (!post) return null;
  const plain = post.toJSON();
  plain.poll = formatPoll(plain.poll, currentUserId, { isAdmin });
  plain.reactions = summarizeReactions(plain.reactions, currentUserId);
  const comments = Array.isArray(plain.comments) ? plain.comments : [];
  const seenComments = new Set();
  plain.comments = comments
    .filter(comment => {
      if (!comment || seenComments.has(comment.id)) return false;
      seenComments.add(comment.id);
      return true;
    })
    .map(comment => serializeComment(comment, currentUserId))
    .filter(Boolean)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  // Serialize images sorted by position
  plain.images = (Array.isArray(plain.images) ? plain.images : [])
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(img => ({
      id: img.id,
      filename: img.filename,
      originalName: img.originalName,
      mimeType: img.mimeType,
      size: img.size,
      position: img.position,
      publicToken: img.publicToken
    }));
  return plain;
}

async function loadPostWithDetails(id) {
  return Post.findByPk(id, { include: postIncludes });
}

async function loadCommentWithDetails(id) {
  return db.post_comment.findByPk(id, {
    include: [
      { model: db.user, as: 'author', attributes: ['id','name'] },
      createCommentReactionInclude(),
      {
        model: db.post_comment,
        as: 'replies',
        required: false,
        include: [
          { model: db.user, as: 'author', attributes: ['id','name'] },
          createCommentReactionInclude()
        ]
      }
    ]
  });
}

async function canAccessPost(post, req) {
  if (!post || post.choirId !== req.activeChoirId) return false;
  const admin = await isChoirAdmin(req);
  if (admin) return true;
  const owner = post.userId === req.userId;
  const stillVisible = !post.expiresAt || new Date(post.expiresAt) > new Date() || owner;
  const publishedOrOwner = post.published || owner;
  return stillVisible && publishedOrOwner;
}

async function upsertPoll(postId, pollPayload, transaction) {
  if (!pollPayload) return null;
  const existing = await db.poll.findOne({
    where: { postId },
    include: [{ model: db.poll_option, as: 'options' }],
    transaction
  });
  if (existing) {
    await existing.update({
      allowMultiple: pollPayload.allowMultiple,
      maxSelections: pollPayload.maxSelections,
      closesAt: pollPayload.closesAt,
      isAnonymous: pollPayload.isAnonymous
    }, { transaction });

    const sortedExisting = [...existing.options].sort((a, b) => a.position - b.position);
    const remaining = [...sortedExisting];
    const assignments = new Array(pollPayload.options.length).fill(null);

    // first try to match by unchanged labels (supports duplicates)
    pollPayload.options.forEach((label, index) => {
      const matchIndex = remaining.findIndex(option => option.label === label);
      if (matchIndex !== -1) {
        assignments[index] = { option: remaining.splice(matchIndex, 1)[0], label, position: index };
      }
    });

    // reuse any still-unmatched existing options to preserve their votes when labels were edited
    pollPayload.options.forEach((label, index) => {
      if (assignments[index] || remaining.length === 0) return;
      assignments[index] = { option: remaining.shift(), label, position: index };
    });

    // create entries for brand new options
    pollPayload.options.forEach((label, index) => {
      if (!assignments[index]) assignments[index] = { option: null, label, position: index };
    });

    for (const assignment of assignments) {
      if (assignment.option) {
        if (assignment.option.label !== assignment.label || assignment.option.position !== assignment.position) {
          await assignment.option.update({ label: assignment.label, position: assignment.position }, { transaction });
        }
      } else {
        await db.poll_option.create({ pollId: existing.id, label: assignment.label, position: assignment.position }, { transaction });
      }
    }

    // remove options that no longer exist, along with their votes
    const removedOptionIds = remaining.map(option => option.id);
    if (removedOptionIds.length > 0) {
      await db.poll_vote.destroy({ where: { pollOptionId: removedOptionIds }, transaction });
      await db.poll_option.destroy({ where: { id: removedOptionIds }, transaction });
    }

    return existing;
  }
  const poll = await db.poll.create({
    postId,
    allowMultiple: pollPayload.allowMultiple,
    maxSelections: pollPayload.maxSelections,
    closesAt: pollPayload.closesAt,
    isAnonymous: pollPayload.isAnonymous
  }, { transaction });
  await db.poll_option.bulkCreate(
    pollPayload.options.map((label, index) => ({ pollId: poll.id, label, position: index })),
    { transaction }
  );
  return poll;
}

exports.create = async (req, res) => {
  const { title, text, expiresAt, sendTest, publish, sendAsUser, poll } = req.body;
  if (!title || !text) return res.status(400).send({ message: 'title and text required' });
  try {
    const admin = await isChoirAdmin(req);
    const sanitizedTitle = stripHtml(title);
    const sanitizedText = stripHtml(text);
    const expDate = expiresAt ? new Date(expiresAt) : null;
    const pollPayload = sanitizePollPayload(poll);
    if (poll !== undefined && poll !== null && !pollPayload) {
      return res.status(400).send({ message: 'Invalid poll configuration' });
    }
    const created = await db.sequelize.transaction(async transaction => {
      const post = await Post.create({
        title: sanitizedTitle,
        text: sanitizedText,
        expiresAt: expDate,
        choirId: req.activeChoirId,
        userId: req.userId,
        published: !!publish,
        sendAsUser: !!sendAsUser
      }, { transaction });
      if (pollPayload) {
        await upsertPoll(post.id, pollPayload, transaction);
      }
      return post;
    });
    const full = await loadPostWithDetails(created.id);

    const author = await db.user.findByPk(req.userId);
    const choir = await db.choir.findByPk(req.activeChoirId);
    const replyTo = sendAsUser && author?.email ? author.email : undefined;

    if (publish) {
      const members = await db.user.findAll({
        include: [{ model: db.choir, where: { id: req.activeChoirId } }]
      });
      const emails = members.map(u => u.email).filter(e => e);
      if (emails.length > 0 && choir) {
        const hasAttachment = !!full.attachmentFilename;
        await emailService.sendPostNotificationMail(emails, sanitizedTitle, sanitizedText, choir.name, replyTo, full.id, hasAttachment);
      }

      if (choir) {
        const url = `/posts/${full.id}`;
        const payload = {
          title: `Neuer Beitrag in ${choir.name}`,
          body: sanitizedTitle,
          url,
          data: { url }
        };
        pushNotificationService
          .sendToChoirMembers(req.activeChoirId, payload, req.userId)
          .catch(err => logger.warn(`Push notification send failed: ${err.message}`));
      }
    } else if (sendTest) {
      const author = await db.user.findByPk(req.userId);
      if (author?.email) {
        const choir = await db.choir.findByPk(req.activeChoirId);
        const hasAttachment = !!full.attachmentFilename;
        await emailService.sendPostNotificationMail([author.email], sanitizedTitle, sanitizedText, choir?.name, replyTo, full.id, hasAttachment);
      }
    }

    res.status(201).send(serializePost(full, req.userId, { isAdmin: admin }));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const admin = await isChoirAdmin(req);
    const where = { choirId: req.activeChoirId };
    if (!admin) {
      where[Op.and] = [
        {
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } },
            { userId: req.userId }
          ]
        },
        {
          [Op.or]: [
            { published: true },
            { userId: req.userId }
          ]
        }
      ];
    }
    const posts = await Post.findAll({
      where,
      include: postIncludes,
      order: [['createdAt', 'DESC']],
      distinct: true
    });
    res.status(200).send(posts.map(p => serializePost(p, req.userId, { isAdmin: admin })));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.findLatest = async (req, res) => {
  try {
    const admin = await isChoirAdmin(req);
    const where = { choirId: req.activeChoirId };
    if (!admin) {
      where[Op.and] = [
        {
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } },
            { userId: req.userId }
          ]
        },
        {
          [Op.or]: [
            { published: true },
            { userId: req.userId }
          ]
        }
      ];
    }
    const post = await Post.findOne({
      where,
      include: postIncludes,
      order: [['createdAt', 'DESC']]
    });
    res.status(200).send(serializePost(post, req.userId, { isAdmin: admin }));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  const { title, text, expiresAt, sendTest, sendAsUser, poll } = req.body;
  if (!title || !text) return res.status(400).send({ message: 'title and text required' });
  try {
    const post = await Post.findByPk(id);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) return res.status(403).send({ message: 'Not allowed' });
    const sanitizedTitle = stripHtml(title);
    const sanitizedText = stripHtml(text);
    const expDate = expiresAt ? new Date(expiresAt) : null;
    const updateData = { title: sanitizedTitle, text: sanitizedText, expiresAt: expDate };
    if (sendAsUser !== undefined) updateData.sendAsUser = !!sendAsUser;
    const pollPayload = sanitizePollPayload(poll);
    if (poll !== undefined && poll !== null && !pollPayload) {
      return res.status(400).send({ message: 'Invalid poll configuration' });
    }
    await db.sequelize.transaction(async transaction => {
      await post.update(updateData, { transaction });
      if (poll === null) {
        const existingPoll = await db.poll.findOne({ where: { postId: post.id }, transaction });
        if (existingPoll) {
          await db.poll_vote.destroy({ where: { pollId: existingPoll.id }, transaction });
          await db.poll_option.destroy({ where: { pollId: existingPoll.id }, transaction });
          await existingPoll.destroy({ transaction });
        }
      } else if (pollPayload) {
        await upsertPoll(post.id, pollPayload, transaction);
      }
    });
    const full = await loadPostWithDetails(id);
    if (sendTest) {
      const author = await db.user.findByPk(req.userId);
      const choir = await db.choir.findByPk(req.activeChoirId);
      const replyTo = post.sendAsUser && author?.email ? author.email : undefined;
      if (author?.email) {
        const hasAttachment = !!full.attachmentFilename;
        await emailService.sendPostNotificationMail([author.email], sanitizedTitle, sanitizedText, choir?.name, replyTo, full.id, hasAttachment);
      }
    }
    res.status(200).send(serializePost(full, req.userId, { isAdmin: admin }));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.publish = async (req, res) => {
  const id = req.params.id;
  try {
    const post = await Post.findByPk(id);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) return res.status(403).send({ message: 'Not allowed' });
    await post.update({ published: true });
    const full = await loadPostWithDetails(id);
    const members = await db.user.findAll({
      include: [{ model: db.choir, where: { id: req.activeChoirId } }]
    });
    const emails = members.map(u => u.email).filter(e => e);
    if (emails.length > 0) {
      const author = await db.user.findByPk(post.userId);
      const choir = await db.choir.findByPk(req.activeChoirId);
      const replyTo = post.sendAsUser && author?.email ? author.email : undefined;
      const hasAttachment = !!full.attachmentFilename;
      await emailService.sendPostNotificationMail(emails, full.title, full.text, choir?.name, replyTo, full.id, hasAttachment);
    }

    const choir = await db.choir.findByPk(req.activeChoirId);
    if (choir) {
      const url = `/posts/${full.id}`;
      const payload = {
        title: `Neuer Beitrag in ${choir.name}`,
        body: full.title,
        url,
        data: { url }
      };
      pushNotificationService
        .sendToChoirMembers(req.activeChoirId, payload, req.userId)
        .catch(err => logger.warn(`Push notification send failed: ${err.message}`));
    }
    res.status(200).send(serializePost(full, req.userId, { isAdmin: admin }));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

function deleteAttachmentFile(filename) {
  if (!filename) return;
  const filePath = path.join(ATTACHMENTS_DIR, filename);
  fs.unlink(filePath, () => {});
}

function deleteImageFile(filename) {
  if (!filename) return;
  const filePath = path.join(IMAGES_DIR, filename);
  fs.unlink(filePath, () => {});
}

async function deleteAllPostImages(postId) {
  const images = await db.post_image.findAll({ where: { postId } });
  for (const img of images) {
    deleteImageFile(img.filename);
  }
  await db.post_image.destroy({ where: { postId } });
}

exports.remove = async (req, res) => {
  const id = req.params.id;
  try {
    const post = await Post.findByPk(id);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) return res.status(403).send({ message: 'Not allowed' });
    deleteAttachmentFile(post.attachmentFilename);
    await deleteAllPostImages(post.id);
    await post.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.vote = async (req, res) => {
  const id = req.params.id;
  const { optionIds } = req.body;
  const uniqueOptionIds = Array.from(new Set((optionIds || []).map(Number).filter(n => !Number.isNaN(n))));
  try {
    const post = await Post.findByPk(id, {
      include: [
        pollInclude,
        { model: db.user, as: 'author', attributes: ['id','name'] }
      ]
    });
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    const isOwner = post.userId === req.userId;
    const stillVisible = !post.expiresAt || new Date(post.expiresAt) > new Date() || isOwner;
    const isPublishedOrOwner = post.published || isOwner;
    if (!admin && (!stillVisible || !isPublishedOrOwner)) {
      return res.status(403).send({ message: 'Not allowed' });
    }
    if (!post.poll) return res.status(400).send({ message: 'Poll not available' });
    if (uniqueOptionIds.length === 0) return res.status(400).send({ message: 'No options selected' });
    if (post.poll.closesAt && new Date(post.poll.closesAt) < new Date()) {
      return res.status(400).send({ message: 'Poll is closed' });
    }
    const pollOptionIds = (post.poll.options || []).map(o => o.id);
    const invalid = uniqueOptionIds.some(idVal => !pollOptionIds.includes(Number(idVal)));
    if (invalid) return res.status(400).send({ message: 'Invalid option selected' });
    if (!post.poll.allowMultiple && uniqueOptionIds.length !== 1) {
      return res.status(400).send({ message: 'Single choice poll requires exactly one option' });
    }
    if (post.poll.allowMultiple && uniqueOptionIds.length > post.poll.maxSelections) {
      return res.status(400).send({ message: 'Too many selections' });
    }
    await db.sequelize.transaction(async transaction => {
      await db.poll_vote.destroy({ where: { pollId: post.poll.id, userId: req.userId }, transaction });
      const votes = uniqueOptionIds.map(optionId => ({
        pollId: post.poll.id,
        pollOptionId: optionId,
        userId: req.userId
      }));
      if (votes.length > 0) {
        await db.poll_vote.bulkCreate(votes, { transaction });
      }
    });
    const fresh = await db.poll.findByPk(post.poll.id, {
      include: [{ model: db.poll_option, as: 'options', include: [{ model: db.poll_vote, as: 'votes', attributes: ['userId'], include: [{ model: db.user, as: 'user', attributes: ['id', 'name', 'firstName'] }] }] }]
    });
    res.status(200).send(formatPoll(fresh, req.userId, { isAdmin: admin }));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getPollReminderStatus = async (req, res) => {
  const postId = Number(req.params.id);
  try {
    const post = await loadPostWithPoll(postId);
    if (!post || post.choirId !== req.activeChoirId) {
      return res.status(404).send({ message: 'Post not found' });
    }
    if (!post.poll) {
      return res.status(400).send({ message: 'Poll not available' });
    }
    if (!post.published) {
      return res.status(400).send({ message: 'Post is not published' });
    }

    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) {
      return res.status(403).send({ message: 'Not allowed' });
    }

    const status = await buildPollReminderStatus(post, req);
    res.status(200).send(status);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.sendPollReminders = async (req, res) => {
  const postId = Number(req.params.id);
  const selectedUserIds = Array.from(new Set((req.body?.userIds || [])
    .map(value => Number(value))
    .filter(value => Number.isInteger(value) && value > 0)));
  const sendTestToSelf = !!req.body?.sendTestToSelf;

  try {
    const post = await loadPostWithPoll(postId);
    if (!post || post.choirId !== req.activeChoirId) {
      return res.status(404).send({ message: 'Post not found' });
    }
    if (!post.poll) {
      return res.status(400).send({ message: 'Poll not available' });
    }

    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) {
      return res.status(403).send({ message: 'Not allowed' });
    }

    if (post.poll.closesAt && new Date(post.poll.closesAt) < new Date()) {
      return res.status(400).send({ message: 'Poll is closed' });
    }

    const pollOptions = [...(post.poll.options || [])].sort((a, b) => a.position - b.position);
    if (pollOptions.length < 2) {
      return res.status(400).send({ message: 'Poll options missing' });
    }

    const singers = await getSingerMembers(req.activeChoirId);
    const voteCountByUserId = await getVoteCountByUserId(post.poll.id);
    const pendingSingers = singers.filter(member => (voteCountByUserId.get(member.id) || 0) === 0);
    const pendingById = new Map(pendingSingers.map(member => [member.id, member]));

    let testRecipient = null;
    let recipients = [];

    if (sendTestToSelf) {
      const self = await db.user.findByPk(req.userId, { attributes: ['id', 'firstName', 'name', 'email'] });
      if (self?.email) {
        testRecipient = {
          id: self.id,
          firstName: self.firstName,
          name: self.name,
          email: self.email
        };
        recipients = [testRecipient];
      }
    } else {
      recipients = (selectedUserIds.length > 0 ? selectedUserIds : pendingSingers.map(member => member.id))
        .map(id => pendingById.get(id))
        .filter(Boolean)
        .filter(member => !!member.email);
    }

    const uniqueRecipients = new Map(recipients.map(member => [member.id, member]));

    if (uniqueRecipients.size === 0) {
      return res.status(200).send({
        sentCount: 0,
        pendingCount: pendingSingers.length,
        testSent: false,
        message: 'Keine Empfänger für Erinnerungen gefunden.'
      });
    }

    const linkBase = await getFrontendUrl();
    const now = new Date();
    const defaultExpiry = new Date(now.getTime() + REMINDER_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    const expiresAt = post.poll.closesAt && new Date(post.poll.closesAt) < defaultExpiry
      ? new Date(post.poll.closesAt)
      : defaultExpiry;

    let sentCount = 0;

    for (const recipient of uniqueRecipients.values()) {
      const links = await db.sequelize.transaction(async transaction => {
        await db.poll_vote_reminder_token.update(
          { invalidatedAt: now },
          {
            where: {
              pollId: post.poll.id,
              userId: recipient.id,
              usedAt: null,
              invalidatedAt: null,
              expiresAt: { [Op.gt]: now }
            },
            transaction
          }
        );

        const result = [];
        for (const option of pollOptions) {
          const rawToken = createReminderToken();
          await db.poll_vote_reminder_token.create({
            pollId: post.poll.id,
            pollOptionId: option.id,
            userId: recipient.id,
            createdByUserId: req.userId,
            tokenHash: hashReminderToken(rawToken),
            expiresAt,
            sentAt: now
          }, { transaction });

          result.push({
            label: option.label,
            url: `${linkBase}/poll-vote/${rawToken}`
          });
        }

        return result;
      });

      const optionLinksHtml = `<ul>${links
        .map(link => `<li>${link.label}: ${link.url}</li>`)
        .join('')}</ul>`;
      const optionLinksText = links
        .map(link => `${link.label}: ${link.url}`)
        .join('\n');

      await emailService.sendPollReminderMail(recipient.email, {
        firstName: recipient.firstName,
        surname: recipient.name,
        postTitle: post.title,
        pollText: post.text,
        choirName: post.choir?.name || '',
        optionLinksHtml,
        optionLinksText
      });
      sentCount += 1;
    }

    res.status(200).send({
      sentCount,
      pendingCount: pendingSingers.length,
      testSent: !!testRecipient,
      message: `${sentCount} Erinnerung${sentCount === 1 ? '' : 'en'} versendet.`
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.consumeReminderVote = async (req, res) => {
  const rawToken = String(req.params.token || '').trim();
  if (!rawToken) {
    return res.status(400).send({ message: 'Token missing' });
  }

  try {
    const tokenHash = hashReminderToken(rawToken);
    const reminderToken = await db.poll_vote_reminder_token.findOne({
      where: { tokenHash },
      include: [
        {
          model: db.poll,
          as: 'poll',
          include: [
            { model: db.poll_option, as: 'options' },
            { model: db.post, as: 'post' }
          ]
        },
        { model: db.poll_option, as: 'option' },
        { model: db.user, as: 'recipient', attributes: ['id', 'firstName', 'name', 'email', 'phone', 'voice', 'roles', 'helpShown'] }
      ]
    });

    if (!reminderToken) {
      return res.status(404).send({ message: 'Ungültiger oder abgelaufener Abstimmungslink.' });
    }

    if (reminderToken.usedAt || reminderToken.invalidatedAt || new Date(reminderToken.expiresAt) <= new Date()) {
      return res.status(410).send({ message: 'Dieser Abstimmungslink wurde bereits verwendet oder ist abgelaufen.' });
    }

    const poll = reminderToken.poll;
    const post = poll?.post;
    if (!poll || !post) {
      return res.status(404).send({ message: 'Abstimmung nicht gefunden.' });
    }

    if (poll.closesAt && new Date(poll.closesAt) < new Date()) {
      return res.status(400).send({ message: 'Die Abstimmung ist bereits geschlossen.' });
    }

    const selectedOptionExists = (poll.options || []).some(option => option.id === reminderToken.pollOptionId);
    if (!selectedOptionExists) {
      return res.status(400).send({ message: 'Ausgewählte Option existiert nicht mehr.' });
    }

    const now = new Date();
    await db.sequelize.transaction(async transaction => {
      if (!poll.allowMultiple) {
        await db.poll_vote.destroy({
          where: { pollId: poll.id, userId: reminderToken.userId },
          transaction
        });

        await db.poll_vote.create({
          pollId: poll.id,
          pollOptionId: reminderToken.pollOptionId,
          userId: reminderToken.userId
        }, { transaction });
      } else {
        const existingVotes = await db.poll_vote.findAll({
          where: { pollId: poll.id, userId: reminderToken.userId },
          attributes: ['pollOptionId'],
          transaction
        });
        const existingOptionIds = new Set(existingVotes.map(vote => vote.pollOptionId));

        if (!existingOptionIds.has(reminderToken.pollOptionId)) {
          const maxSelections = Math.max(1, Number(poll.maxSelections) || 1);
          if (existingOptionIds.size >= maxSelections) {
            throw new Error('Maximale Anzahl an Auswahloptionen bereits erreicht.');
          }
          await db.poll_vote.create({
            pollId: poll.id,
            pollOptionId: reminderToken.pollOptionId,
            userId: reminderToken.userId
          }, { transaction });
        }
      }

      await reminderToken.update({ usedAt: now }, { transaction });

      if (!poll.allowMultiple) {
        await db.poll_vote_reminder_token.update(
          { invalidatedAt: now },
          {
            where: {
              pollId: poll.id,
              userId: reminderToken.userId,
              id: { [Op.ne]: reminderToken.id },
              usedAt: null,
              invalidatedAt: null
            },
            transaction
          }
        );
      }
    });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).send({ message: 'JWT secret is not configured.' });
    }

    const accessToken = jwt.sign(
      {
        id: reminderToken.recipient.id,
        activeChoirId: post.choirId,
        roles: reminderToken.recipient.roles || []
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

    setAuthCookie(res, accessToken, true);
    const userPayload = await buildSigninResponse(reminderToken.recipient.id, post.choirId, accessToken);

    return res.status(200).send({
      message: 'Vielen Dank für deine Stimme! Du wirst nun zum Beitrag weitergeleitet.',
      postId: post.id,
      accessToken,
      user: userPayload
    });
  } catch (err) {
    if (err?.message === 'Maximale Anzahl an Auswahloptionen bereits erreicht.') {
      return res.status(400).send({ message: err.message });
    }
    return res.status(500).send({ message: err.message });
  }
};

exports.addComment = async (req, res) => {
  const postId = Number(req.params.id);
  const { text, parentId } = req.body;
  const sanitizedText = stripHtml(String(text || '').trim());
  if (!sanitizedText) return res.status(400).send({ message: 'text required' });
  try {
    const post = await Post.findByPk(postId);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    if (!(await canAccessPost(post, req))) return res.status(403).send({ message: 'Not allowed' });
    let parentComment = null;
    if (parentId !== undefined && parentId !== null) {
      parentComment = await db.post_comment.findByPk(parentId);
      if (!parentComment || parentComment.postId !== post.id || parentComment.choirId !== req.activeChoirId) {
        return res.status(404).send({ message: 'Parent comment not found' });
      }
    }
    const created = await db.post_comment.create({
      text: sanitizedText,
      postId: post.id,
      choirId: req.activeChoirId,
      parentId: parentComment ? parentComment.id : null,
      userId: req.userId
    });
    const full = await loadCommentWithDetails(created.id);
    res.status(201).send(serializeComment(full, req.userId));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.removeComment = async (req, res) => {
  const postId = Number(req.params.id);
  const commentId = Number(req.params.commentId);
  try {
    const comment = await db.post_comment.findByPk(commentId);
    if (!comment || comment.postId !== postId || comment.choirId !== req.activeChoirId) {
      return res.status(404).send({ message: 'Comment not found' });
    }
    const post = await Post.findByPk(postId);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    const isOwner = comment.userId === req.userId;
    const postOwner = post.userId === req.userId;
    if (!admin && !isOwner && !postOwner) {
      return res.status(403).send({ message: 'Not allowed' });
    }
    await comment.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.reactOnPost = async (req, res) => {
  const postId = Number(req.params.id);
  const { type } = req.body;
  const reactionType = type === undefined ? null : type;
  if (reactionType && !REACTION_TYPES.includes(reactionType)) {
    return res.status(400).send({ message: 'Invalid reaction type' });
  }
  try {
    const post = await Post.findByPk(postId);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    if (!(await canAccessPost(post, req))) return res.status(403).send({ message: 'Not allowed' });
    const where = { postId: post.id, userId: req.userId };
    await db.post_reaction.destroy({ where });
    if (reactionType) {
      await db.post_reaction.create({ postId: post.id, userId: req.userId, type: reactionType });
    }
    const reactions = await db.post_reaction.findAll({
      where: { postId: post.id },
      attributes: ['id', 'type', 'userId']
    });
    res.status(200).send(summarizeReactions(reactions, req.userId));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.reactOnComment = async (req, res) => {
  const postId = Number(req.params.id);
  const commentId = Number(req.params.commentId);
  const { type } = req.body;
  const reactionType = type === undefined ? null : type;
  if (reactionType && !REACTION_TYPES.includes(reactionType)) {
    return res.status(400).send({ message: 'Invalid reaction type' });
  }
  try {
    const comment = await db.post_comment.findByPk(commentId);
    if (!comment || comment.postId !== postId || comment.choirId !== req.activeChoirId) {
      return res.status(404).send({ message: 'Comment not found' });
    }
    const post = await Post.findByPk(postId);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    if (!(await canAccessPost(post, req))) return res.status(403).send({ message: 'Not allowed' });
    const where = { commentId: comment.id, userId: req.userId };
    await db.post_reaction.destroy({ where });
    if (reactionType) {
      await db.post_reaction.create({ commentId: comment.id, userId: req.userId, type: reactionType });
    }
    const reactions = await db.post_reaction.findAll({
      where: { commentId: comment.id },
      attributes: ['id', 'type', 'userId']
    });
    res.status(200).send(summarizeReactions(reactions, req.userId));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.uploadAttachment = async (req, res) => {
  const id = req.params.id;
  if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });
  try {
    const post = await Post.findByPk(id);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) return res.status(403).send({ message: 'Not allowed' });
    deleteAttachmentFile(post.attachmentFilename);
    await post.update({
      attachmentFilename: req.file.filename,
      attachmentOriginalName: req.file.originalname
    });
    const full = await loadPostWithDetails(id);
    res.status(200).send(serializePost(full, req.userId, { isAdmin: admin }));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.removeAttachment = async (req, res) => {
  const id = req.params.id;
  try {
    const post = await Post.findByPk(id);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) return res.status(403).send({ message: 'Not allowed' });
    deleteAttachmentFile(post.attachmentFilename);
    await post.update({ attachmentFilename: null, attachmentOriginalName: null });
    const full = await loadPostWithDetails(id);
    res.status(200).send(serializePost(full, req.userId, { isAdmin: admin }));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.downloadAttachment = async (req, res) => {
  const id = req.params.id;
  try {
    const post = await Post.findByPk(id);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    if (!(await canAccessPost(post, req))) return res.status(403).send({ message: 'Not allowed' });
    if (!post.attachmentFilename) return res.status(404).send({ message: 'No attachment' });
    const filePath = path.join(ATTACHMENTS_DIR, post.attachmentFilename);
    if (!fs.existsSync(filePath)) return res.status(404).send({ message: 'File not found' });
    res.download(filePath, post.attachmentOriginalName || post.attachmentFilename);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// ── Post Images ─────────────────────────────────────────────────────────

exports.uploadImage = async (req, res) => {
  const postId = req.params.id;
  if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });
  try {
    const post = await Post.findByPk(postId);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) return res.status(403).send({ message: 'Not allowed' });

    const imageCount = await db.post_image.count({ where: { postId } });
    if (imageCount >= MAX_IMAGES_PER_POST) {
      // Clean up the uploaded file
      fs.unlink(req.file.path, () => {});
      return res.status(400).send({ message: `Maximal ${MAX_IMAGES_PER_POST} Bilder pro Beitrag erlaubt.` });
    }

    const image = await db.post_image.create({
      postId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      position: imageCount
    });

    res.status(201).send({
      id: image.id,
      filename: image.filename,
      originalName: image.originalName,
      mimeType: image.mimeType,
      size: image.size,
      position: image.position,
      publicToken: image.publicToken,
      url: `/api/posts/${postId}/images/${image.id}`
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.removeImage = async (req, res) => {
  const { id, imageId } = req.params;
  try {
    const post = await Post.findByPk(id);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) return res.status(403).send({ message: 'Not allowed' });

    const image = await db.post_image.findOne({ where: { id: imageId, postId: id } });
    if (!image) return res.status(404).send({ message: 'Image not found' });

    deleteImageFile(image.filename);
    await image.destroy();

    // Re-order remaining images
    const remaining = await db.post_image.findAll({ where: { postId: id }, order: [['position', 'ASC']] });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i) {
        await remaining[i].update({ position: i });
      }
    }

    res.status(200).send({ message: 'Image deleted' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getImage = async (req, res) => {
  const { id, imageId } = req.params;
  try {
    const post = await Post.findByPk(id);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    if (!(await canAccessPost(post, req))) return res.status(403).send({ message: 'Not allowed' });

    const image = await db.post_image.findOne({ where: { id: imageId, postId: id } });
    if (!image) return res.status(404).send({ message: 'Image not found' });

    const filePath = path.join(IMAGES_DIR, image.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send({ message: 'File not found' });

    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getPostImages = async (req, res) => {
  const postId = req.params.id;
  try {
    const post = await Post.findByPk(postId);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    if (!(await canAccessPost(post, req))) return res.status(403).send({ message: 'Not allowed' });

    const images = await db.post_image.findAll({
      where: { postId },
      order: [['position', 'ASC']],
      attributes: ['id', 'filename', 'originalName', 'mimeType', 'size', 'position', 'publicToken']
    });

    res.status(200).send(images.map(img => ({
      id: img.id,
      filename: img.filename,
      originalName: img.originalName,
      mimeType: img.mimeType,
      size: img.size,
      position: img.position,
      publicToken: img.publicToken,
      url: `/api/posts/${postId}/images/${img.id}`
    })));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// ── Public image access (no auth required, token-based) ──────────────

exports.getImageByToken = async (req, res) => {
  // Strip any file extension appended for email client compatibility
  const token = (req.params.token || '').replace(/\.[a-zA-Z0-9]+$/, '');
  if (!token || typeof token !== 'string' || token.length < 32) {
    return res.status(400).send({ message: 'Invalid token' });
  }
  try {
    const image = await db.post_image.findOne({ where: { publicToken: token } });
    if (!image) return res.status(404).send({ message: 'Image not found' });

    const filePath = path.join(IMAGES_DIR, image.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send({ message: 'File not found' });

    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${image.originalName}"`);
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days for public/email images
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
