const db = require('../models');
const PhysicalCopy = db.physical_copy;
const DigitalLicense = db.digital_license;
const LibraryItem = db.library_item;

// --- Physical Copies ---

exports.listPhysicalCopies = async (req, res) => {
  const { id } = req.params;
  const item = await LibraryItem.findByPk(id);
  if (!item) return res.status(404).send({ message: 'Library item not found.' });

  const copies = await PhysicalCopy.findAll({
    where: { libraryItemId: id },
    order: [['purchaseDate', 'DESC']]
  });
  res.status(200).send(copies);
};

exports.createPhysicalCopy = async (req, res) => {
  const { id } = req.params;
  const item = await LibraryItem.findByPk(id);
  if (!item) return res.status(404).send({ message: 'Library item not found.' });

  const { quantity, purchaseDate, vendor, unitPrice, notes, condition } = req.body;
  const copy = await PhysicalCopy.create({
    libraryItemId: id,
    quantity: quantity || 1,
    purchaseDate,
    vendor,
    unitPrice,
    notes,
    condition
  });

  await recalcCopies(id);
  res.status(201).send(copy);
};

exports.updatePhysicalCopy = async (req, res) => {
  const { copyId } = req.params;
  const copy = await PhysicalCopy.findByPk(copyId);
  if (!copy) return res.status(404).send({ message: 'Physical copy not found.' });

  const { quantity, purchaseDate, vendor, unitPrice, notes, condition } = req.body;
  const data = {};
  if (quantity !== undefined) data.quantity = quantity;
  if (purchaseDate !== undefined) data.purchaseDate = purchaseDate;
  if (vendor !== undefined) data.vendor = vendor;
  if (unitPrice !== undefined) data.unitPrice = unitPrice;
  if (notes !== undefined) data.notes = notes;
  if (condition !== undefined) data.condition = condition;

  await copy.update(data);
  await recalcCopies(copy.libraryItemId);
  res.status(200).send(copy);
};

exports.deletePhysicalCopy = async (req, res) => {
  const { copyId } = req.params;
  const copy = await PhysicalCopy.findByPk(copyId);
  if (!copy) return res.status(404).send({ message: 'Physical copy not found.' });

  const libraryItemId = copy.libraryItemId;
  await copy.destroy();
  await recalcCopies(libraryItemId);
  res.status(204).send();
};

// --- Digital Licenses ---

exports.listDigitalLicenses = async (req, res) => {
  const { id } = req.params;
  const item = await LibraryItem.findByPk(id);
  if (!item) return res.status(404).send({ message: 'Library item not found.' });

  const licenses = await DigitalLicense.findAll({
    where: { libraryItemId: id },
    order: [['purchaseDate', 'DESC']]
  });
  res.status(200).send(licenses);
};

exports.createDigitalLicense = async (req, res) => {
  const { id } = req.params;
  const item = await LibraryItem.findByPk(id);
  if (!item) return res.status(404).send({ message: 'Library item not found.' });

  const { licenseNumber, licenseType, quantity, purchaseDate, vendor, unitPrice, validFrom, validUntil, notes } = req.body;
  const license = await DigitalLicense.create({
    libraryItemId: id,
    licenseNumber,
    licenseType: licenseType || 'print',
    quantity,
    purchaseDate,
    vendor,
    unitPrice,
    validFrom,
    validUntil,
    notes
  });

  res.status(201).send(license);
};

exports.updateDigitalLicense = async (req, res) => {
  const { licenseId } = req.params;
  const license = await DigitalLicense.findByPk(licenseId);
  if (!license) return res.status(404).send({ message: 'Digital license not found.' });

  const { licenseNumber, licenseType, quantity, purchaseDate, vendor, unitPrice, validFrom, validUntil, notes } = req.body;
  const data = {};
  if (licenseNumber !== undefined) data.licenseNumber = licenseNumber;
  if (licenseType !== undefined) data.licenseType = licenseType;
  if (quantity !== undefined) data.quantity = quantity;
  if (purchaseDate !== undefined) data.purchaseDate = purchaseDate;
  if (vendor !== undefined) data.vendor = vendor;
  if (unitPrice !== undefined) data.unitPrice = unitPrice;
  if (validFrom !== undefined) data.validFrom = validFrom;
  if (validUntil !== undefined) data.validUntil = validUntil;
  if (notes !== undefined) data.notes = notes;

  await license.update(data);
  res.status(200).send(license);
};

exports.deleteDigitalLicense = async (req, res) => {
  const { licenseId } = req.params;
  const license = await DigitalLicense.findByPk(licenseId);
  if (!license) return res.status(404).send({ message: 'Digital license not found.' });

  await license.destroy();
  res.status(204).send();
};

// --- Helper: Recalculate total copies on LibraryItem ---

async function recalcCopies(libraryItemId) {
  const copies = await PhysicalCopy.findAll({ where: { libraryItemId } });
  const total = copies.reduce((sum, c) => sum + (c.quantity || 0), 0);
  await LibraryItem.update({ copies: total }, { where: { id: libraryItemId } });
}
