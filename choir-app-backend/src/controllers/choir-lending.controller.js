const db = require('../models');
const Lending = db.lending;
const { lendingListPdf } = require('../services/pdf.service');
const { Op } = require('sequelize');
const { updateBorrower } = require('../services/lending.service');

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
    where: { borrowerId: req.userId, collectionId: { [Op.ne]: null } },
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
  const copy = await updateBorrower(id, req.body);
  if (!copy) return res.status(404).send({ message: 'Copy not found.' });
  res.status(200).send(copy);
};

// Generate PDF list for copies of a choir collection
exports.downloadPdf = async (req, res) => {
  const { id } = req.params;
  const collection = await db.collection.findByPk(id);
  if (!collection) return res.status(404).send({ message: 'Collection not found.' });

  const rawCopies = await Lending.findAll({
    where: { collectionId: id },
    include: [{ model: db.user, as: 'borrower', attributes: ['name'] }],
    order: [['copyNumber', 'ASC']]
  });

  const copies = rawCopies.map(c => ({
    copyNumber: c.copyNumber,
    borrowerName: c.borrowerName || (c.borrower ? c.borrower.name : ''),
    borrowedAt: c.borrowedAt,
    returnedAt: c.returnedAt
  }));

  const pdf = lendingListPdf(collection.title, copies);
  res.setHeader('Content-Type', 'application/pdf');
  res.status(200).send(pdf);
};
