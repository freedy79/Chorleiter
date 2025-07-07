const db = require('../models');
const { Op } = require('sequelize');

exports.search = async (req, res) => {
  const q = req.query.q || req.query.query || '';
  if (!q) return res.status(400).send({ message: 'Missing search query' });
  try {
    const like = { [Op.iLike]: `%${q}%` };
    const pieces = await db.piece.findAll({
      where: { title: like },
      include: [{ model: db.composer, as: 'composer', attributes: ['name'] }],
      limit: 10
    });
    const events = await db.event.findAll({
      where: {
        choirId: req.activeChoirId,
        [Op.or]: [
          { notes: like },
          { type: like }
        ]
      },
      order: [['date', 'DESC']],
      limit: 10
    });
    const collections = await db.collection.findAll({
      where: {
        [Op.or]: [
          { title: like },
          { prefix: like }
        ]
      },
      limit: 10
    });
    res.status(200).send({ pieces, events, collections });
  } catch (err) {
    console.error('search error', err);
    res.status(500).send({ message: 'Search failed' });
  }
};
