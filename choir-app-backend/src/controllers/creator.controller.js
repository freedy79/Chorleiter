const BaseCrudController = require('./baseCrud.controller');
const db = require('../models');
const { isDuplicate } = require('../utils/name.utils');

function createCreatorController(Model, options = {}) {
  const base = new BaseCrudController(Model);
  const { entityName = 'Record', arranged = false, pieceField } = options;


  async function create(req, res, next) {
    try {
      const { name, birthYear, deathYear } = req.body;
      const force = req.query.force === 'true';
      if (!force) {
        const existing = await Model.findOne({ where: { name } });
        if (existing) {
          return res.status(409).send({ message: `A ${entityName.toLowerCase()} with this name already exists.` });
        }
      }
      req.body = { name, birthYear, deathYear };
      return await base.create(req, res, next);
    } catch (err) {
      if (next) return next(err);
      res.status(500).send({ message: err.message });
    }
  }

  async function update(req, res, next) {
    try {
      const id = req.params.id;
      const { name } = req.body;
      const force = req.query.force === 'true';
      if (name && !force) {
        const existing = await Model.findOne({ where: { name } });
        if (existing && existing.id !== parseInt(id, 10)) {
          return res.status(409).send({ message: `A ${entityName.toLowerCase()} with this name already exists.` });
        }
      }
      return await base.update(req, res, next);
    } catch (err) {
      if (next) return next(err);
      res.status(500).send({ message: err.message });
    }
  }

  async function findAll(req, res, next) {
    try {
      const records = await base.service.findAll({ order: [['name', 'ASC']] });
      const result = await Promise.all(
        records.map(async (record) => {
          const pieceCount = await record.countPieces();
          const arrangedCount = arranged ? await record.countArrangedPieces() : 0;
          return {
            ...record.get({ plain: true }),
            canDelete: pieceCount + arrangedCount === 0
          };
        })
      );
      res.status(200).send(result);
    } catch (err) {
      if (next) return next(err);
      res.status(500).send({ message: err.message });
    }
  }

  async function remove(req, res, next) {
    const { id } = req.params;
    try {
      const record = await Model.findByPk(id);
      if (!record) return res.status(404).send({ message: `${entityName} not found.` });
      const pieceCount = await record.countPieces();
      const arrangedCount = arranged ? await record.countArrangedPieces() : 0;
      if (pieceCount + arrangedCount > 0) {
        return res.status(400).send({ message: `${entityName} has linked pieces.` });
      }
      return base.delete(req, res, next);
    } catch (err) {
      if (next) return next(err);
      res.status(500).send({ message: err.message });
    }
  }

  async function fetchWithRetry(url, options, retries = 3) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const response = await fetch(url, options);
      if (response.status !== 429) return response;
      const retryAfter = parseInt(response.headers.get('retry-after'), 10);
      const delay = Number.isNaN(retryAfter) ? (attempt + 1) * 1000 : retryAfter * 1000;
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error('Too many requests');
  }

  async function enrich(req, res) {
    const { id } = req.params;
    try {
      const record = await Model.findByPk(id);
      if (!record) return res.status(404).send({ message: `${entityName} not found.` });

      const query = encodeURIComponent(record.name);
      const url = `https://musicbrainz.org/ws/2/artist/?query=${query}&fmt=json&limit=1`;
      const response = await fetchWithRetry(url, {
        headers: { 'User-Agent': 'chorleiter/1.0 ( https://example.com )' }
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      const artist = data.artists && data.artists[0];
      if (artist && artist['life-span']) {
        const span = artist['life-span'];
        if (span.begin) record.birthYear = span.begin.substring(0, 4);
        if (span.end) record.deathYear = span.end.substring(0, 4);
        await record.save();
        return res.status(200).send(record);
      }
      return res.status(404).send({ message: 'No data found' });
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  }

  async function findDuplicates(req, res, next) {
    try {
      const records = await Model.findAll({ order: [['name', 'ASC']] });
      const duplicates = [];
      const visited = new Set();
      for (let i = 0; i < records.length; i += 1) {
        const current = records[i];
        if (visited.has(current.id)) continue;
        const group = [current];
        for (let j = i + 1; j < records.length; j += 1) {
          const other = records[j];
          if (visited.has(other.id)) continue;
          if (isDuplicate(current.name, other.name)) {
            group.push(other);
            visited.add(other.id);
          }
        }
        if (group.length > 1) {
          duplicates.push(group.map(r => r.get({ plain: true })));
          group.forEach(r => visited.add(r.id));
        }
      }
      res.status(200).send(duplicates);
    } catch (err) {
      if (next) return next(err);
      res.status(500).send({ message: err.message });
    }
  }

  async function migrate(req, res, next) {
    const { sourceId, targetId } = req.body;
    const transaction = await db.sequelize.transaction();
    try {
      const source = await Model.findByPk(sourceId, { transaction });
      const target = await Model.findByPk(targetId, { transaction });
      if (!source || !target) {
        await transaction.rollback();
        return res.status(404).send({ message: `${entityName} not found.` });
      }
      if (source.id === target.id) {
        await transaction.rollback();
        return res.status(400).send({ message: 'Cannot migrate to the same record.' });
      }
      const updatePieces = {};
      updatePieces[pieceField] = targetId;
      await db.piece.update(updatePieces, { where: { [pieceField]: sourceId }, transaction });
      if (arranged) {
        await db.piece_arranger.update({ composerId: targetId }, { where: { composerId: sourceId }, transaction });
      }
      await Model.destroy({ where: { id: sourceId }, transaction });
      await transaction.commit();
      res.status(200).send({ message: 'Migration completed.' });
    } catch (err) {
      await transaction.rollback();
      if (next) return next(err);
      res.status(500).send({ message: err.message });
    }
  }

  return { create, update, findAll, delete: remove, enrich, findDuplicates, migrate };
}

module.exports = createCreatorController;
