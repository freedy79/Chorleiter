const BaseCrudController = require('./baseCrud.controller');

function createCreatorController(Model, options = {}) {
  const base = new BaseCrudController(Model);
  const { entityName = 'Record', arranged = false } = options;

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
      const record = await base.service.create({ name, birthYear, deathYear });
      res.status(201).send(record);
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
      const num = await base.service.update(id, req.body);
      if (num === 1) {
        const updated = await base.service.findById(id);
        return res.status(200).send(updated);
      }
      res.status(404).send({ message: `${entityName} not found.` });
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

  async function enrich(req, res) {
    const { id } = req.params;
    try {
      const record = await Model.findByPk(id);
      if (!record) return res.status(404).send({ message: `${entityName} not found.` });

      const query = encodeURIComponent(record.name);
      const url = `https://musicbrainz.org/ws/2/artist/?query=${query}&fmt=json&limit=1`;
      const response = await fetch(url, {
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

  return { create, update, findAll, delete: remove, enrich };
}

module.exports = createCreatorController;
