const db = require('../models');
const District = db.district;

exports.getAll = async (_req, res) => {
  try {
    const districts = await District.findAll({ order: [['name', 'ASC']] });
    res.status(200).send(districts);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    return res.status(400).send({ message: 'Name and code are required.' });
  }
  try {
    const district = await District.create({ name, code });
    res.status(201).send(district);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).send({ message: 'District already exists.' });
    }
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    return res.status(400).send({ message: 'Name and code are required.' });
  }
  try {
    const id = req.params.id;
    const district = await District.findByPk(id);
    if (!district) {
      return res.status(404).send({ message: 'District not found.' });
    }
    district.name = name;
    district.code = code;
    await district.save();
    res.status(200).send(district);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).send({ message: 'District already exists.' });
    }
    res.status(500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    const district = await District.findByPk(id);
    if (!district) {
      return res.status(404).send({ message: 'District not found.' });
    }
    await district.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
