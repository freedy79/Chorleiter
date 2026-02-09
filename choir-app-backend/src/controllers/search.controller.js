const db = require('../models');
const { Op, where, cast, col, fn, literal } = require('sequelize');

exports.search = async (req, res) => {
  const q = req.query.q || req.query.query || '';
  if (!q) return res.status(400).send({ message: 'Missing search query' });

  const likeOp = db.sequelize.getDialect() === 'sqlite' ? Op.like : Op.iLike;
  const like = { [likeOp]: `%${q}%` };

  let pieces = await db.piece.findAll({
    where: {
      [Op.or]: [
        { title: like },
        { lyrics: like },
        { origin: like }
      ]
    },
    include: [
      { model: db.composer, as: 'composer', attributes: ['name'] },
      {
        model: db.collection,
        attributes: ['id', 'prefix', 'singleEdition', 'title'],
        through: { attributes: ['numberInCollection'] }
      }
    ],
    limit: 10
  });

  pieces = pieces.map(p => p.get({ plain: true }));
  if (pieces.length) {
    const ratings = await db.choir_repertoire.findAll({
      where: { choirId: req.activeChoirId, pieceId: pieces.map(p => p.id) },
      attributes: ['pieceId', 'rating'],
      raw: true
    });
    const ratingMap = new Map(ratings.map(r => [r.pieceId, r.rating]));
    pieces = pieces.map(p => ({ ...p, choir_repertoire: { rating: ratingMap.get(p.id) || null } }));
  }

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

function normalizeType(type) {
  if (!type) return null;
  const t = String(type).toLowerCase();
  const allowed = new Set(['pieces', 'piece', 'composers', 'composer', 'collections', 'collection', 'categories', 'category', 'authors', 'author', 'publishers', 'publisher']);
  return allowed.has(t) ? t : null;
}

function buildPrefixLike(dbInstance, query) {
  const likeOp = dbInstance.sequelize.getDialect() === 'sqlite' ? Op.like : Op.iLike;
  return { op: likeOp, value: `${query}%` };
}

function buildExactOrder(dbInstance, columnName, query) {
  const escaped = dbInstance.sequelize.escape(String(query).toLowerCase());
  const colRef = `"${columnName}"`;
  return literal(`CASE WHEN LOWER(${colRef}) = ${escaped} THEN 0 ELSE 1 END`);
}

exports.suggestions = async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const rawType = normalizeType(req.query.type);
  if (!q) {
    return res.status(200).send({ suggestions: [], total: 0 });
  }
  if (req.query.type && !rawType) {
    return res.status(400).send({ message: 'Invalid type' });
  }

  const { op, value } = buildPrefixLike(db, q);
  const limit = 10;
  const dialect = db.sequelize.getDialect();
  const lengthFn = dialect === 'sqlite' ? 'length' : 'LENGTH';

  const suggestions = [];
  const counts = [];

  const maybeFetch = async (typeKey, fetcher) => {
    if (!rawType || rawType === typeKey || rawType === typeKey.slice(0, -1)) {
      const { rows, count } = await fetcher();
      counts.push(count || 0);
      suggestions.push(...rows);
    }
  };

  await maybeFetch('pieces', async () => {
    const rows = await db.piece.findAll({
      where: {
        [Op.or]: [
          { title: { [op]: value } },
          { subtitle: { [op]: value } }
        ]
      },
      include: [
        { model: db.composer, as: 'composer', attributes: ['name'] },
        { model: db.category, as: 'category', attributes: ['name'] }
      ],
      order: [
        [buildExactOrder(db, 'title', q), 'ASC'],
        [fn(lengthFn, col('title')), 'ASC'],
        ['title', 'ASC']
      ],
      limit
    });

    const count = await db.piece.count({
      where: {
        [Op.or]: [
          { title: { [op]: value } },
          { subtitle: { [op]: value } }
        ]
      }
    });

    return {
      rows: rows.map(p => ({
        id: p.id,
        text: p.title,
        type: 'piece',
        subtitle: p.composer?.name || p.origin || p.subtitle || null,
        metadata: { category: p.category?.name || null }
      })),
      count
    };
  });

  await maybeFetch('composers', async () => {
    const rows = await db.composer.findAll({
      where: { name: { [op]: value } },
      order: [
        [buildExactOrder(db, 'name', q), 'ASC'],
        [fn(lengthFn, col('name')), 'ASC'],
        ['name', 'ASC']
      ],
      limit
    });
    const count = await db.composer.count({ where: { name: { [op]: value } } });
    return {
      rows: rows.map(c => ({
        id: c.id,
        text: c.name,
        type: 'composer',
        subtitle: [c.birthYear, c.deathYear].filter(Boolean).join('–') || null,
        metadata: null
      })),
      count
    };
  });

  await maybeFetch('collections', async () => {
    const rows = await db.collection.findAll({
      where: {
        [Op.or]: [
          { title: { [op]: value } },
          { subtitle: { [op]: value } },
          { prefix: { [op]: value } }
        ]
      },
      include: [{ model: db.publisher, as: 'publisherEntity', attributes: ['name'] }],
      order: [
        [buildExactOrder(db, 'title', q), 'ASC'],
        [fn(lengthFn, col('title')), 'ASC'],
        ['title', 'ASC']
      ],
      limit
    });
    const count = await db.collection.count({
      where: {
        [Op.or]: [
          { title: { [op]: value } },
          { subtitle: { [op]: value } },
          { prefix: { [op]: value } }
        ]
      }
    });
    return {
      rows: rows.map(c => ({
        id: c.id,
        text: c.title,
        type: 'collection',
        subtitle: c.publisherEntity?.name || c.prefix || c.subtitle || null,
        metadata: { publisher: c.publisherEntity?.name || null }
      })),
      count
    };
  });

  await maybeFetch('categories', async () => {
    const rows = await db.category.findAll({
      where: { name: { [op]: value } },
      order: [
        [buildExactOrder(db, 'name', q), 'ASC'],
        [fn(lengthFn, col('name')), 'ASC'],
        ['name', 'ASC']
      ],
      limit
    });
    const count = await db.category.count({ where: { name: { [op]: value } } });
    return {
      rows: rows.map(c => ({
        id: c.id,
        text: c.name,
        type: 'category',
        subtitle: null,
        metadata: null
      })),
      count
    };
  });

  await maybeFetch('authors', async () => {
    const rows = await db.author.findAll({
      where: { name: { [op]: value } },
      order: [
        [buildExactOrder(db, 'name', q), 'ASC'],
        [fn(lengthFn, col('name')), 'ASC'],
        ['name', 'ASC']
      ],
      limit
    });
    const count = await db.author.count({ where: { name: { [op]: value } } });
    return {
      rows: rows.map(a => ({
        id: a.id,
        text: a.name,
        type: 'author',
        subtitle: [a.birthYear, a.deathYear].filter(Boolean).join('–') || null,
        metadata: null
      })),
      count
    };
  });

  await maybeFetch('publishers', async () => {
    const rows = await db.publisher.findAll({
      where: { name: { [op]: value } },
      order: [
        [buildExactOrder(db, 'name', q), 'ASC'],
        [fn(lengthFn, col('name')), 'ASC'],
        ['name', 'ASC']
      ],
      limit
    });
    const count = await db.publisher.count({ where: { name: { [op]: value } } });
    return {
      rows: rows.map(p => ({
        id: p.id,
        text: p.name,
        type: 'publisher',
        subtitle: null,
        metadata: null
      })),
      count
    };
  });

  const sorted = suggestions
    .map((s, idx) => {
      const exact = s.text?.toLowerCase() === q.toLowerCase();
      return { ...s, _rank: exact ? 0 : 1, _idx: idx };
    })
    .sort((a, b) => (a._rank - b._rank) || (a._idx - b._idx))
    .slice(0, limit)
    .map(({ _rank, _idx, ...rest }) => rest);

  const total = counts.reduce((sum, c) => sum + c, 0);
  res.status(200).send({ suggestions: sorted, total });
};

exports.saveHistory = async (req, res) => {
  const { query, filterData, resultCount, clickedResultId } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).send({ message: 'Query is required' });
  }

  try {
    const entry = await db.search_history.create({
      userId: req.userId,
      query: query.trim(),
      filterData: filterData || null,
      resultCount: resultCount || null,
      clickedResultId: clickedResultId || null,
      timestamp: new Date()
    });
    res.status(201).send(entry);
  } catch (err) {
    console.error('[SearchHistoryController] saveHistory error:', err.message, err.stack);
    res.status(500).send({ message: err.message, details: err.stack });
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
    res.status(200).send(history);
  } catch (err) {
    console.error('[SearchHistoryController] getHistory error:', err.message, err.stack);
    res.status(500).send({ message: err.message, details: err.stack });
  }
};

exports.deleteHistoryEntry = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || isNaN(id)) {
    return res.status(400).send({ message: 'Invalid ID' });
  }

  try {
    const entry = await db.search_history.findByPk(id);
    if (!entry) {
      return res.status(404).send({ message: 'Entry not found' });
    }
    if (entry.userId !== req.userId) {
      return res.status(403).send({ message: 'Forbidden' });
    }
    await entry.destroy();
    res.status(200).send({ message: 'Deleted' });
  } catch (err) {
    console.error('[SearchHistoryController] deleteHistoryEntry error:', err.message, err.stack);
    res.status(500).send({ message: err.message, details: err.stack });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    await db.search_history.destroy({ where: { userId: req.userId } });
    res.status(200).send({ message: 'History cleared' });
  } catch (err) {
    console.error('[SearchHistoryController] clearHistory error:', err.message, err.stack);
    res.status(500).send({ message: err.message, details: err.stack });
  }
};
