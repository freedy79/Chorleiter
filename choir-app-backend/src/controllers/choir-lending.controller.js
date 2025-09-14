const db = require('../models');
const Lending = db.lending;
const { Op } = require('sequelize');

// List copies for a choir collection
exports.list = async (req, res) => {
  const { id } = req.params;
  const copies = await Lending.findAll({
    where: { collectionId: id },
    include: [{ model: db.user, as: 'borrower', attributes: ['id', 'name'] }],
    order: [['copyNumber', 'ASC']]
  });
  res.status(200).send(copies);
};

// List copies borrowed by current user
exports.listForUser = async (req, res) => {
  const copies = await Lending.findAll({
    where: { borrowerId: req.userId },
    include: [{ model: db.collection, as: 'collection', attributes: ['id', 'title'] }],
    order: [['copyNumber', 'ASC']]
  });
  res.status(200).send(copies);
};

// Initialize copies for a collection
exports.init = async (req, res) => {
  const { id } = req.params;
  const { copies } = req.body;
  if (!copies || copies < 1) {
    return res.status(400).send({ message: 'copies must be >= 1' });
  }
  const existing = await Lending.count({ where: { collectionId: id } });
  if (existing > 0) {
    return res.status(400).send({ message: 'Copies already initialized.' });
  }
  for (let i = 1; i <= copies; i++) {
    await Lending.create({ collectionId: id, copyNumber: i });
  }
  const result = await Lending.findAll({
    where: { collectionId: id },
    order: [['copyNumber', 'ASC']]
  });
  res.status(201).send(result);
};

// Adjust number of copies for a collection
exports.setCount = async (req, res) => {
  const { id } = req.params;
  const { copies } = req.body;
  if (copies === undefined || copies < 1) {
    return res.status(400).send({ message: 'copies must be >= 1' });
  }
  const existing = await Lending.count({ where: { collectionId: id } });
  if (copies > existing) {
    for (let i = existing + 1; i <= copies; i++) {
      await Lending.create({ collectionId: id, copyNumber: i });
    }
  } else if (copies < existing) {
    const borrowed = await Lending.count({ where: { collectionId: id, status: 'borrowed' } });
    if (borrowed > 0) {
      return res.status(400).send({ message: 'Cannot reduce copies while borrowed copies exist.' });
    }
    await Lending.destroy({ where: { collectionId: id, copyNumber: { [Op.gt]: copies } } });
  }
  const result = await Lending.findAll({
    where: { collectionId: id },
    order: [['copyNumber', 'ASC']]
  });
  res.status(200).send(result);
};

// Update borrower of a copy
exports.update = async (req, res) => {
  const { id } = req.params;
  const copy = await Lending.findByPk(id);
  if (!copy) return res.status(404).send({ message: 'Copy not found.' });
  const { borrowerName, borrowerId } = req.body;
  const data = {};
  if (borrowerName !== undefined) {
    data.borrowerName = borrowerName;
    data.status = borrowerName ? 'borrowed' : 'available';
    if (borrowerName) {
      data.borrowedAt = new Date();
      data.returnedAt = null;
      if (borrowerId !== undefined) data.borrowerId = borrowerId;
    } else {
      data.returnedAt = new Date();
      data.borrowerId = null;
    }
  } else if (borrowerId !== undefined) {
    data.borrowerId = borrowerId;
  }
  await copy.update(data);
  res.status(200).send(copy);
};
