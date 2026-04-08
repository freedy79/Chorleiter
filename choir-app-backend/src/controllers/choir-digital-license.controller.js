const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const db = require('../models');
const logger = require('../config/logger');

const ChoirDigitalLicense = db.choir_digital_license;

const ensureCollectionInActiveChoir = async (collectionId, choirId) => db.collection.findOne({
  where: { id: collectionId },
  include: [{
    model: db.choir,
    attributes: ['id'],
    where: { id: choirId },
    through: { attributes: [] },
    required: true
  }]
});

const removeLicenseDocumentIfExists = async (license) => {
  if (!license?.documentPath) return;

  const absolutePath = path.isAbsolute(license.documentPath)
    ? license.documentPath
    : path.join(__dirname, '../..', license.documentPath);

  if (fs.existsSync(absolutePath)) {
    await fs.promises.unlink(absolutePath);
  }
};

exports.list = async (req, res) => {
  const { id } = req.params;
  const choirId = req.activeChoirId;

  const collection = await ensureCollectionInActiveChoir(id, choirId);
  if (!collection) return res.status(404).send({ message: 'Collection not found in active choir.' });

  const licenses = await ChoirDigitalLicense.findAll({
    where: { collectionId: id, choirId },
    order: [['purchaseDate', 'DESC'], ['id', 'DESC']]
  });

  res.status(200).send(licenses);
};

exports.create = async (req, res) => {
  const { id } = req.params;
  const choirId = req.activeChoirId;

  const collection = await ensureCollectionInActiveChoir(id, choirId);
  if (!collection) return res.status(404).send({ message: 'Collection not found in active choir.' });

  const { licenseNumber, licenseType, quantity, purchaseDate, vendor, unitPrice, validFrom, validUntil, notes } = req.body;
  const created = await ChoirDigitalLicense.create({
    choirId,
    collectionId: id,
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

  res.status(201).send(created);
};

exports.update = async (req, res) => {
  const { licenseId } = req.params;
  const choirId = req.activeChoirId;

  const license = await ChoirDigitalLicense.findOne({ where: { id: licenseId, choirId } });
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

exports.remove = async (req, res) => {
  const { licenseId } = req.params;
  const choirId = req.activeChoirId;

  const license = await ChoirDigitalLicense.findOne({ where: { id: licenseId, choirId } });
  if (!license) return res.status(404).send({ message: 'Digital license not found.' });

  await removeLicenseDocumentIfExists(license);
  await license.destroy();
  res.status(204).send();
};

exports.uploadDocument = async (req, res) => {
  const { licenseId } = req.params;
  const choirId = req.activeChoirId;

  const license = await ChoirDigitalLicense.findOne({ where: { id: licenseId, choirId } });
  if (!license) return res.status(404).send({ message: 'Digital license not found.' });
  if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });

  await removeLicenseDocumentIfExists(license);

  const relativePath = path.join('uploads', 'choir-digital-license-files', req.file.filename);
  await license.update({
    documentPath: relativePath,
    documentOriginalName: req.file.originalname,
    documentMime: req.file.mimetype,
    documentSize: req.file.size
  });

  res.status(200).send(license);
};

exports.downloadDocument = async (req, res) => {
  const { licenseId } = req.params;
  const choirId = req.activeChoirId;

  const license = await ChoirDigitalLicense.findOne({ where: { id: licenseId, choirId } });
  if (!license) return res.status(404).send({ message: 'Digital license not found.' });
  if (!license.documentPath) return res.status(404).send({ message: 'No document available for this license.' });

  const absolutePath = path.isAbsolute(license.documentPath)
    ? license.documentPath
    : path.join(__dirname, '../..', license.documentPath);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).send({ message: 'Stored document file not found.' });
  }

  res.setHeader('Content-Type', license.documentMime || 'application/pdf');
  return res.download(absolutePath, license.documentOriginalName || `license-${license.id}.pdf`);
};

exports.listViewableForCollection = async (req, res) => {
  const { id } = req.params;
  const choirId = req.activeChoirId;

  const collection = await ensureCollectionInActiveChoir(id, choirId);
  if (!collection) return res.status(200).send([]);

  const licenses = await ChoirDigitalLicense.findAll({
    where: {
      collectionId: id,
      choirId,
      documentPath: { [db.Sequelize.Op.ne]: null }
    },
    attributes: ['id', 'collectionId', 'licenseNumber', 'licenseType', 'documentOriginalName', 'documentMime', 'updatedAt'],
    order: [['updatedAt', 'DESC'], ['id', 'DESC']]
  });

  res.status(200).send(licenses);
};

exports.streamDocumentInline = async (req, res) => {
  const { licenseId } = req.params;
  const choirId = req.activeChoirId;

  const license = await ChoirDigitalLicense.findOne({ where: { id: licenseId, choirId } });
  if (!license) return res.status(404).send({ message: 'Digital license not found.' });
  if (!license.documentPath) return res.status(404).send({ message: 'No document available for this license.' });

  const absolutePath = path.isAbsolute(license.documentPath)
    ? license.documentPath
    : path.join(__dirname, '../..', license.documentPath);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).send({ message: 'Stored document file not found.' });
  }

  const mime = license.documentMime || 'application/pdf';
  const fileName = (license.documentOriginalName || `license-${license.id}.pdf`).replace(/"/g, '');

  // For PDFs: add watermark and prevent download via Content-Disposition
  if (mime === 'application/pdf') {
    try {
      // Fetch user and choir names for watermark
      const [user, choir] = await Promise.all([
        db.user.findByPk(req.userId, { attributes: ['firstName', 'name', 'email'] }),
        db.choir.findByPk(choirId, { attributes: ['name'] })
      ]);

      const userName = user
        ? [user.firstName, user.name].filter(Boolean).join(' ') || user.email
        : `Benutzer #${req.userId}`;
      const choirName = choir?.name || `Chor #${choirId}`;
      const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const watermarkText = `${userName} – ${choirName} – ${dateStr}`;

      const existingPdfBytes = await fs.promises.readFile(absolutePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 8;
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width } = page.getSize();
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        const x = (width - textWidth) / 2;

        page.drawText(watermarkText, {
          x,
          y: 12,
          size: fontSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.6
        });
      }

      const watermarkedBytes = await pdfDoc.save();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Length', watermarkedBytes.length);

      return res.end(Buffer.from(watermarkedBytes));
    } catch (err) {
      logger.warn('Failed to add watermark to license PDF, serving original', {
        licenseId,
        error: err.message
      });
      // Fall through to serve the original file without watermark
    }
  }

  // Non-PDF or watermark failed: serve original
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return res.sendFile(absolutePath);
};
