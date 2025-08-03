const { parse } = require('csv-parse');
const db = require('../models');
const LibraryItem = db.library_item;
const Piece = db.piece;

// List all library items with piece details
exports.findAll = async (req, res) => {
  const items = await LibraryItem.findAll({
    include: [{ model: Piece, as: 'piece' }]
  });
  res.status(200).send(items);
};

// Import library items from CSV (pieceId;copies)
exports.importCsv = async (req, res) => {
  if (!req.file) return res.status(400).send({ message: 'No CSV file uploaded.' });

  const fileContent = req.file.buffer.toString('utf-8');
  const parser = parse(fileContent, { delimiter: ';', columns: header => header.map(h => h.trim().toLowerCase()), skip_empty_lines: true, trim: true });

  for await (const record of parser) {
    const pieceId = parseInt(record.pieceid || record.piece_id || record.id);
    if (!pieceId) continue;
    const copies = record.exemplare ? parseInt(record.exemplare) : record.copies ? parseInt(record.copies) : 1;
    await LibraryItem.create({ pieceId, copies });
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
