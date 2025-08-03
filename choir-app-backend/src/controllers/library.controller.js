const { parse } = require('csv-parse');
const db = require('../models');
const LibraryItem = db.library_item;
const Piece = db.piece;
const Collection = db.collection;

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
  res.status(200).send(items);
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
