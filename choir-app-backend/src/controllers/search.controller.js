const db = require('../models');
const { Op, where, cast, col, fn, literal } = require('sequelize');

/**
 * Build a safe EXISTS subquery matching pieces by collection reference (prefix + numberInCollection).
 * Uses sequelize.escape() to prevent SQL injection.
 */
function buildRefSubquery(dbInstance, searchTerm) {
  const escaped = dbInstance.sequelize.escape(`%${searchTerm}%`);
  const dialect = dbInstance.sequelize.getDialect();
  const ilike = dialect === 'sqlite' ? 'LIKE' : 'ILIKE';
  return literal(`EXISTS (
    SELECT 1 FROM collection_pieces cp
    JOIN collections c ON cp."collectionId" = c.id
    WHERE cp."pieceId" = "piece"."id"
    AND (c.prefix || cp."numberInCollection") ${ilike} ${escaped}
  )`);
}

exports.search = async (req, res) => {
  const q = req.query.q || req.query.query || '';
  if (!q) return res.status(400).send({ message: 'Missing search query' });

  const likeOp = db.sequelize.getDialect() === 'sqlite' ? Op.like : Op.iLike;
  const normalizedQ = q.replace(/[\s,.!?;:'"()\-–—\/\\]+/g, '%');
  const like = { [likeOp]: `%${normalizedQ}%` };

  const limit = parseInt(req.query.limit) || 10;
  const offsetPieces = parseInt(req.query.offsetPieces) || 0;
  const offsetEvents = parseInt(req.query.offsetEvents) || 0;
  const offsetCollections = parseInt(req.query.offsetCollections) || 0;

  const pieceWhere = {
    [Op.or]: [
      { title: like },
      { lyrics: like },
      { origin: like },
      buildRefSubquery(db, normalizedQ)
    ]
  };

  // --- Direct piece matches (title, lyrics, origin, collection reference) ---
  const [pieces_raw, totalPieces] = await Promise.all([
    db.piece.findAll({
      where: pieceWhere,
      include: [
        { model: db.composer, as: 'composer', attributes: ['name'] },
        {
          model: db.collection,
          attributes: ['id', 'prefix', 'singleEdition', 'title'],
          through: { attributes: ['numberInCollection'] }
        }
      ],
      limit,
      offset: offsetPieces
    }),
    db.piece.count({ where: pieceWhere })
  ]);
  let pieces = pieces_raw.map(p => p.get({ plain: true }));

  if (pieces.length) {
    const ratings = await db.choir_repertoire.findAll({
      where: { choirId: req.activeChoirId, pieceId: pieces.map(p => p.id) },
      attributes: ['pieceId', 'rating'],
      raw: true
    });
    const ratingMap = new Map(ratings.map(r => [r.pieceId, r.rating]));
    pieces = pieces.map(p => ({ ...p, choir_repertoire: { rating: ratingMap.get(p.id) || null } }));
  }

  const eventWhere = {
    choirId: req.activeChoirId,
    [Op.or]: [
      { notes: like },
      where(cast(col('type'), 'TEXT'), { [likeOp]: `%${q}%` })
    ]
  };

  const collectionWhere = {
    [Op.or]: [
      { title: like },
      { subtitle: like },
      { prefix: like }
    ]
  };

  const [events, totalEvents, collections, totalCollections] = await Promise.all([
    db.event.findAll({
      where: eventWhere,
      order: [['date', 'DESC']],
      limit,
      offset: offsetEvents
    }),
    db.event.count({ where: eventWhere }),
    db.collection.findAll({
      where: collectionWhere,
      limit,
      offset: offsetCollections
    }),
    db.collection.count({ where: collectionWhere })
  ]);

  // --- Composer -> Pieces expansion ---
  const matchedComposers = await db.composer.findAll({
    where: { name: like },
    limit: 5
  });

  const directPieceIds = new Set(pieces.map(p => p.id));
  const composerPieces = [];

  for (const comp of matchedComposers) {
    let compPieces = await db.piece.findAll({
      where: {
        composerId: comp.id,
        id: { [Op.notIn]: [...directPieceIds] }
      },
      include: [
        { model: db.composer, as: 'composer', attributes: ['name'] },
        { model: db.category, as: 'category', attributes: ['name'] },
        {
          model: db.collection,
          attributes: ['id', 'prefix', 'singleEdition', 'title'],
          through: { attributes: ['numberInCollection'] }
        }
      ],
      limit: 5
    });
    compPieces = compPieces.map(p => p.get({ plain: true }));
    if (compPieces.length) {
      composerPieces.push({
        composer: { id: comp.id, name: comp.name },
        pieces: compPieces
      });
    }
  }

  // --- Publisher -> Collections expansion ---
  const directCollectionIds = new Set(collections.map(c => c.id));
  const publisherCollections = [];

  // Match via publisher entity (FK)
  const matchedPublishers = await db.publisher.findAll({
    where: { name: like },
    limit: 5
  });

  for (const pub of matchedPublishers) {
    const pubCollections = await db.collection.findAll({
      where: {
        publisherId: pub.id,
        id: { [Op.notIn]: [...directCollectionIds] }
      },
      limit: 5
    });
    if (pubCollections.length) {
      publisherCollections.push({
        publisher: { id: pub.id, name: pub.name },
        collections: pubCollections.map(c => c.get({ plain: true }))
      });
      pubCollections.forEach(c => directCollectionIds.add(c.id));
    }
  }

  // Match via legacy publisher string field
  const legacyPubCollections = await db.collection.findAll({
    where: {
      publisher: like,
      id: { [Op.notIn]: [...directCollectionIds] }
    },
    limit: 5
  });

  if (legacyPubCollections.length) {
    const grouped = {};
    for (const c of legacyPubCollections) {
      const plain = c.get({ plain: true });
      const key = plain.publisher;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(plain);
    }
    for (const [pubName, colls] of Object.entries(grouped)) {
      const alreadyMatched = publisherCollections.some(
        pc => pc.publisher.name.toLowerCase() === pubName.toLowerCase()
      );
      if (!alreadyMatched) {
        publisherCollections.push({
          publisher: { id: null, name: pubName },
          collections: colls
        });
      }
    }
  }

  res.status(200).send({
    pieces, totalPieces,
    events, totalEvents,
    collections, totalCollections,
    composerPieces, publisherCollections
  });
};

function normalizeType(type) {
  if (!type) return null;
  const t = String(type).toLowerCase();
  const allowed = new Set(['pieces', 'piece', 'composers', 'composer', 'collections', 'collection', 'categories', 'category', 'authors', 'author', 'publishers', 'publisher']);
  return allowed.has(t) ? t : null;
}

function buildPrefixLike(dbInstance, query) {
  const likeOp = dbInstance.sequelize.getDialect() === 'sqlite' ? Op.like : Op.iLike;
  // Replace punctuation/whitespace with % wildcard so "Halleluja komm" matches "Halleluja, komm!"
  const normalized = query.replace(/[\s,.!?;:'"()\-–—\/\\]+/g, '%');
  return { op: likeOp, value: `${normalized}%` };
}
function buildContainsLike(dbInstance, query) {
  const likeOp = dbInstance.sequelize.getDialect() === 'sqlite' ? Op.like : Op.iLike;
  const normalized = query.replace(/[\s,.!?;:'"()\-\u2013\u2014\/\\]+/g, '%');
  return { op: likeOp, value: `%${normalized}%` };
}

/**
 * Build a safe EXISTS subquery for piece suggestions matching collection references.
 */
function buildRefExistsForSuggestions(dbInstance, searchTerm) {
  const escaped = dbInstance.sequelize.escape(`${searchTerm}%`);
  const dialect = dbInstance.sequelize.getDialect();
  const ilike = dialect === 'sqlite' ? 'LIKE' : 'ILIKE';
  return literal(`EXISTS (
    SELECT 1 FROM collection_pieces cp
    JOIN collections c ON cp."collectionId" = c.id
    WHERE cp."pieceId" = "piece"."id"
    AND (c.prefix || cp."numberInCollection") ${ilike} ${escaped}
  )`);
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
  const { op: containsOp, value: containsValue } = buildContainsLike(db, q);
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
    const pieceWhere = {
      [Op.or]: [
        { title: { [op]: value } },
        { subtitle: { [op]: value } },
        { lyrics: { [containsOp]: containsValue } },
        buildRefExistsForSuggestions(db, q)
      ]
    };

    const rows = await db.piece.findAll({
      where: pieceWhere,
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

    const count = await db.piece.count({ where: pieceWhere });

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
    const composerWhere = { name: { [Op.or]: [{ [op]: value }, { [containsOp]: containsValue }] } };
    const rows = await db.composer.findAll({
      where: composerWhere,
      order: [
        [buildExactOrder(db, 'name', q), 'ASC'],
        [fn(lengthFn, col('name')), 'ASC'],
        ['name', 'ASC']
      ],
      limit
    });
    const count = await db.composer.count({ where: composerWhere });
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
    const authorWhere = { name: { [Op.or]: [{ [op]: value }, { [containsOp]: containsValue }] } };
    const rows = await db.author.findAll({
      where: authorWhere,
      order: [
        [buildExactOrder(db, 'name', q), 'ASC'],
        [fn(lengthFn, col('name')), 'ASC'],
        ['name', 'ASC']
      ],
      limit
    });
    const count = await db.author.count({ where: authorWhere });
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
    const publisherWhere = { name: { [Op.or]: [{ [op]: value }, { [containsOp]: containsValue }] } };
    const rows = await db.publisher.findAll({
      where: publisherWhere,
      order: [
        [buildExactOrder(db, 'name', q), 'ASC'],
        [fn(lengthFn, col('name')), 'ASC'],
        ['name', 'ASC']
      ],
      limit
    });
    const count = await db.publisher.count({ where: publisherWhere });
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
