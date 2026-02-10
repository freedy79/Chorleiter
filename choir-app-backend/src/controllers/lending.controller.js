const db = require('../models');
const LibraryItem = db.library_item;
const Lending = db.lending;
const { lendingListPdf } = require('../services/pdf.service');
const { updateBorrower } = require('../services/lending.service');

// List copies for a library item
exports.list = async (req, res) => {
  const { id } = req.params;
  const item = await LibraryItem.findByPk(id);
  if (!item) return res.status(404).send({ message: 'Library item not found.' });
  const copies = await Lending.findAll({
    where: { libraryItemId: id },
    include: [{ model: db.user, as: 'borrower', attributes: ['id', 'name'] }],
    order: [['copyNumber', 'ASC']]
  });
  res.status(200).send(copies);
};

// Update borrower of a copy
exports.update = async (req, res) => {
  const { id } = req.params;
  const copy = await updateBorrower(id, req.body);
  if (!copy) return res.status(404).send({ message: 'Copy not found.' });
  res.status(200).send(copy);
};

// Generate PDF list for copies. Creates missing copy entries.
exports.downloadPdf = async (req, res) => {
  const { id } = req.params;
  const item = await LibraryItem.findByPk(id, {
    include: [{ model: db.collection, as: 'collection' }, { model: Lending, as: 'booklets', order: [['copyNumber', 'ASC']] }]
  });
  if (!item) return res.status(404).send({ message: 'Library item not found.' });

  if (!item.booklets || item.booklets.length < item.copies) {
    const existing = item.booklets ? item.booklets.map(b => b.copyNumber) : [];
    for (let i = 1; i <= item.copies; i++) {
      if (!existing.includes(i)) {
        await Lending.create({ libraryItemId: item.id, copyNumber: i });
      }
    }
  }
  const rawCopies = await Lending.findAll({
    where: { libraryItemId: item.id },
    include: [{ model: db.user, as: 'borrower', attributes: ['name'] }],
    order: [['copyNumber', 'ASC']]
  });

  const copies = rawCopies.map(c => ({
    copyNumber: c.copyNumber,
    borrowerName: c.borrowerName || (c.borrower ? c.borrower.name : ''),
    borrowedAt: c.borrowedAt,
    returnedAt: c.returnedAt
  }));

  const pdf = await lendingListPdf(item.collection ? item.collection.title : 'Ausleihe', copies);
  res.setHeader('Content-Type', 'application/pdf');
  res.status(200).send(pdf);
};
