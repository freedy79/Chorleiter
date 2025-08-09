const { parse } = require('csv-parse');
const db = require('../models');
const LibraryItem = db.library_item;
const Piece = db.piece;
const Collection = db.collection;
const LoanRequest = db.loan_request;
const LoanRequestItem = db.loan_request_item;
const Choir = db.choir;

// List all library items with collection details
exports.findAll = async (req, res) => {
  const items = await LibraryItem.findAll({
    include: [
      {
        model: Collection,
        as: 'collection',
        include: [{ model: Piece, through: { attributes: ['numberInCollection'] } }]
      }
    ]
  });

  const now = new Date();
  const result = items.map(item => {
    const plain = item.toJSON();
    if (plain.collection) {
      plain.collection.pieceCount = plain.collection.pieces ? plain.collection.pieces.length : 0;
    }
    if (plain.status === 'borrowed' && plain.availableAt && new Date(plain.availableAt) < now) {
      plain.status = 'due';
    }
    return plain;
  });

  res.status(200).send(result);
};

// Create a library item referencing a collection
exports.create = async (req, res) => {
  const { collectionId, copies = 1, isBorrowed = false } = req.body;

  const collection = await Collection.findByPk(collectionId);
  if (!collection) return res.status(404).send({ message: 'Collection not found.' });

  const item = await LibraryItem.create({
    collectionId,
    copies,
    status: isBorrowed ? 'borrowed' : 'available'
  });

  res.status(201).send(item);
};

// Import library items from CSV (collectionId;copies)
exports.importCsv = async (req, res) => {
  if (!req.file) return res.status(400).send({ message: 'No CSV file uploaded.' });

  const fileContent = req.file.buffer.toString('utf-8');
  const parser = parse(fileContent, { delimiter: ';', columns: header => header.map(h => h.trim().toLowerCase()), skip_empty_lines: true, trim: true });

  for await (const record of parser) {
    const collectionId = parseInt(record.collectionid || record.collection_id || record.id);
    if (!collectionId) continue;
    const copies = record.exemplare ? parseInt(record.exemplare) : record.copies ? parseInt(record.copies) : 1;
    await LibraryItem.create({ collectionId, copies });
  }

  res.status(200).send({ message: 'Import complete.' });
};

// Update copies or status of a library item
exports.update = async (req, res) => {
  const id = req.params.id;
  const { copies, status, availableAt } = req.body;
  const item = await LibraryItem.findByPk(id);
  if (!item) return res.status(404).send({ message: 'Library item not found.' });

  const data = {};
  if (copies !== undefined) data.copies = copies;
  if (status) {
    data.status = status;
    if (status === 'available') {
      data.availableAt = null;
    } else if (availableAt) {
      data.availableAt = availableAt;
    }
  } else if (availableAt !== undefined) {
    data.availableAt = availableAt;
  }

  await item.update(data);
  res.status(200).send(item);
};

// Borrow an item - only directors may borrow
exports.borrow = async (req, res) => {
  const id = req.params.id;
  const item = await LibraryItem.findByPk(id);
  if (!item) return res.status(404).send({ message: 'Library item not found.' });

  const returnDate = new Date();
  returnDate.setMonth(returnDate.getMonth() + 3);

  await item.update({ status: 'borrowed', availableAt: returnDate });
  res.status(200).send(item);
};

// Return an item
exports.returnItem = async (req, res) => {
  const id = req.params.id;
  const item = await LibraryItem.findByPk(id);
  if (!item) return res.status(404).send({ message: 'Library item not found.' });
  await item.update({ status: 'available', availableAt: null });
  res.status(200).send(item);
};

// Delete a library item
exports.remove = async (req, res) => {
  const id = req.params.id;
  const item = await LibraryItem.findByPk(id);
  if (!item) return res.status(404).send({ message: 'Library item not found.' });
  await item.destroy();
  res.status(204).send();
};

// Create loan request for multiple library items
exports.requestLoan = async (req, res) => {
  const { items = [], startDate, endDate, reason } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).send({ message: 'No items provided.' });
  }

  const ids = items.map(i => i.libraryItemId);
  const libraryItems = await LibraryItem.findAll({ where: { id: ids } });
  if (libraryItems.length !== ids.length) {
    return res.status(404).send({ message: 'One or more library items not found.' });
  }

  for (const libItem of libraryItems) {
    await libItem.update({ status: 'requested' });
  }

  const request = await LoanRequest.create({
    choirId: req.activeChoirId,
    userId: req.userId,
    startDate,
    endDate,
    reason
  });

  for (const item of items) {
    await LoanRequestItem.create({
      loanRequestId: request.id,
      libraryItemId: item.libraryItemId,
      quantity: item.quantity || 1
    });
  }

  const created = await LoanRequest.findByPk(request.id, {
    include: [{ model: LoanRequestItem, as: 'items' }]
  });

  res.status(201).send(created);
};

// List all loan requests with associated items
exports.listLoans = async (req, res) => {
  const requests = await LoanRequest.findAll({
    include: [
      { model: LoanRequestItem, as: 'items', include: [{ model: LibraryItem, as: 'libraryItem', include: [{ model: Collection, as: 'collection' }] }] },
      { model: Choir, as: 'choir' }
    ]
  });

  const now = new Date();
  const result = [];
  for (const reqItem of requests) {
    for (const item of reqItem.items) {
      if (!item.libraryItem || !item.libraryItem.collection) continue;
      let status = item.libraryItem.status;
      if (status === 'borrowed' && reqItem.endDate && new Date(reqItem.endDate) < now) {
        status = 'due';
      }
      result.push({
        id: reqItem.id,
        collectionTitle: item.libraryItem.collection.title,
        choirName: reqItem.choir ? reqItem.choir.name : '',
        startDate: reqItem.startDate,
        endDate: reqItem.endDate,
        status
      });
    }
  }

  res.status(200).send(result);
};
