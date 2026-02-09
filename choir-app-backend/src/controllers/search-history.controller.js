const db = require('../models');
const { Op } = require('sequelize');

exports.saveSearch = async (req, res) => {
  const { query, filterData, resultCount, clickedResultId, clickedResultType } = req.body;

  if (!query) {
    return res.status(400).send({ message: 'Query is required' });
  }

  try {
    const entry = await db.search_history.create({
      userId: req.userId,
      query,
      filterData: filterData || null,
      resultCount: resultCount || null,
      clickedResultId: clickedResultId || null,
      clickedResultType: clickedResultType || null,
      timestamp: new Date()
    });

    res.status(201).send(entry);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getHistory = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;

  try {
    const history = await db.search_history.findAll({
      where: { userId: req.userId },
      order: [['timestamp', 'DESC']],
      limit,
      attributes: ['id', 'query', 'filterData', 'resultCount', 'timestamp']
    });

    // Group by query to deduplicate
    const uniqueQueries = new Map();
    for (const entry of history) {
      const key = entry.query.toLowerCase();
      if (!uniqueQueries.has(key)) {
        uniqueQueries.set(key, entry);
      }
    }

    const unique = Array.from(uniqueQueries.values()).slice(0, limit);
    res.status(200).send(unique);
  } catch (err) {
    console.error('[SearchHistoryController] getHistory error:', err.message, err.stack);
    res.status(500).send({ message: err.message, details: err.stack });
  }
};

exports.deleteEntry = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const entry = await db.search_history.findOne({
      where: { id, userId: req.userId }
    });

    if (!entry) {
      return res.status(404).send({ message: 'History entry not found' });
    }

    await entry.destroy();
    res.status(200).send({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    await db.search_history.destroy({
      where: { userId: req.userId }
    });

    res.status(200).send({ message: 'History cleared' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getTopSearches = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  try {
    const results = await db.search_history.findAll({
      attributes: [
        'query',
        [db.sequelize.fn('COUNT', db.sequelize.col('query')), 'count']
      ],
      group: ['query'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('query')), 'DESC']],
      limit,
      raw: true
    });

    res.status(200).send(results);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getNullResultQueries = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;

  try {
    const results = await db.search_history.findAll({
      where: {
        [Op.or]: [
          { resultCount: 0 },
          { resultCount: null }
        ]
      },
      attributes: [
        'query',
        [db.sequelize.fn('COUNT', db.sequelize.col('query')), 'count']
      ],
      group: ['query'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('query')), 'DESC']],
      limit,
      raw: true
    });

    res.status(200).send(results);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
