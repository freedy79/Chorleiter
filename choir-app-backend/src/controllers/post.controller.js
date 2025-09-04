const db = require('../models');
const Post = db.post;
const emailService = require('../services/email.service');
const { Op } = require('sequelize');

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, '');
}

async function isChoirAdmin(req) {
  if (req.userRoles.includes('admin')) return true;
  const assoc = await db.user_choir.findOne({ where: { userId: req.userId, choirId: req.activeChoirId } });
  return assoc && Array.isArray(assoc.rolesInChoir) && assoc.rolesInChoir.includes('choir_admin');
}

exports.create = async (req, res) => {
  const { title, text, expiresAt, sendTest, publish } = req.body;
  if (!title || !text) return res.status(400).send({ message: 'title and text required' });
  try {
    const sanitizedTitle = stripHtml(title);
    const sanitizedText = stripHtml(text);
    const expDate = expiresAt ? new Date(expiresAt) : null;
    const post = await Post.create({
      title: sanitizedTitle,
      text: sanitizedText,
      expiresAt: expDate,
      choirId: req.activeChoirId,
      userId: req.userId,
      published: !!publish
    });
    const full = await Post.findByPk(post.id, { include: [
      { model: db.user, as: 'author', attributes: ['id','name'] }
    ] });


    if (publish) {
      const members = await db.user.findAll({
        include: [{ model: db.choir, where: { id: req.activeChoirId } }]
      });
      const choir = await db.choir.findByPk(req.activeChoirId);
      const emails = members.map(u => u.email).filter(e => e);
      if (emails.length > 0 && choir) {
        await emailService.sendPostNotificationMail(emails, sanitizedTitle, sanitizedText, choir.name);
      }
    } else if (sendTest) {
      const author = await db.user.findByPk(req.userId);
      if (author?.email) {
        const choir = await db.choir.findByPk(req.activeChoirId);
        await emailService.sendPostNotificationMail([author.email], sanitizedTitle, sanitizedText, choir?.name);
      }
    }

    res.status(201).send(full);
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
      include: [
        { model: db.user, as: 'author', attributes: ['id','name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).send(posts);
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
      include: [
        { model: db.user, as: 'author', attributes: ['id','name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).send(post);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  const { title, text, expiresAt, sendTest } = req.body;
  if (!title || !text) return res.status(400).send({ message: 'title and text required' });
  try {
    const post = await Post.findByPk(id);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) return res.status(403).send({ message: 'Not allowed' });
    const sanitizedTitle = stripHtml(title);
    const sanitizedText = stripHtml(text);
    const expDate = expiresAt ? new Date(expiresAt) : null;
    await post.update({ title: sanitizedTitle, text: sanitizedText, expiresAt: expDate });
    const full = await Post.findByPk(id, { include: [
      { model: db.user, as: 'author', attributes: ['id','name'] }
    ] });
    if (sendTest) {
      const author = await db.user.findByPk(req.userId);
      if (author?.email) {
        await emailService.sendPostNotificationMail([author.email], sanitizedTitle, sanitizedText);
      }
    }
    res.status(200).send(full);
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
    const full = await Post.findByPk(id, { include: [
      { model: db.user, as: 'author', attributes: ['id','name'] }
    ] });
    const members = await db.user.findAll({
      include: [{ model: db.choir, where: { id: req.activeChoirId } }]
    });
    const emails = members.map(u => u.email).filter(e => e);
    if (emails.length > 0) {
      await emailService.sendPostNotificationMail(emails, full.title, full.text);
    }
    res.status(200).send(full);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  const id = req.params.id;
  try {
    const post = await Post.findByPk(id);
    if (!post || post.choirId !== req.activeChoirId) return res.status(404).send({ message: 'Post not found' });
    const admin = await isChoirAdmin(req);
    if (post.userId !== req.userId && !admin) return res.status(403).send({ message: 'Not allowed' });
    await post.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
