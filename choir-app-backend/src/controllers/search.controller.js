const db = require('../models');
const { Op, where, cast, col } = require('sequelize');

exports.search = async (req, res) => {
  const q = req.query.q || req.query.query || '';
  if (!q) return res.status(400).send({ message: 'Missing search query' });

  const likeOp = db.sequelize.getDialect() === 'sqlite' ? Op.like : Op.iLike;
  const like = { [likeOp]: `%${q}%` };

  const pieces = await db.piece.findAll({
    where: {
      [Op.or]: [
        { title: like },
        { lyrics: like },
        { origin: like }
      ]
    },
    include: [{ model: db.composer, as: 'composer', attributes: ['name'] }],
    limit: 10
  });

  const events = await db.event.findAll({
    where: {
      choirId: req.activeChoirId,
      [Op.or]: [
        { notes: like },
        where(cast(col('type'), 'TEXT'), { [likeOp]: `%${q}%` })
      ]
    },
    order: [['date', 'DESC']],
    limit: 10
  });

  const collections = await db.collection.findAll({
    where: {
      [Op.or]: [
        { title: like },
        { subtitle: like },
        { prefix: like }
      ]
    },
    limit: 10
  });

  res.status(200).send({ pieces, events, collections });
};
