const fs = require('fs/promises');
const path = require('path');
const db = require('../models');
const { Op } = require('sequelize');

const BASE_DIR = path.join(__dirname, '..', '..', 'uploads');
const DIRS = {
  covers: 'collection-covers',
  images: 'piece-images',
  files: 'piece-files',
};

async function safeReaddir(sub) {
  try {
    const entries = await fs.readdir(path.join(BASE_DIR, sub));
    return entries.filter(name => name !== '.gitkeep');
  } catch {
    return [];
  }
}

async function listFilesWithSizes(sub) {
  const names = await safeReaddir(sub);
  const entries = await Promise.all(
    names.map(async (name) => {
      try {
        const stat = await fs.stat(path.join(BASE_DIR, sub, name));
        return {
          filename: name,
          sizeBytes: stat.isFile() ? stat.size : 0,
        };
      } catch {
        return {
          filename: name,
          sizeBytes: 0,
        };
      }
    })
  );

  return entries;
}

function sumSize(entries) {
  return entries.reduce((total, entry) => total + (entry.sizeBytes || 0), 0);
}

async function listFiles() {
  const [coverEntries, imageEntries, fileEntries, collections, pieces, links] = await Promise.all([
    listFilesWithSizes(DIRS.covers),
    listFilesWithSizes(DIRS.images),
    listFilesWithSizes(DIRS.files),
    db.collection.findAll({ attributes: ['id', 'title', 'coverImage'], where: { coverImage: { [Op.not]: null } } }),
    db.piece.findAll({ attributes: ['id', 'title', 'imageIdentifier'], where: { imageIdentifier: { [Op.not]: null } } }),
    db.piece_link.findAll({
      where: { type: 'FILE_DOWNLOAD' },
      attributes: ['url', 'pieceId', 'downloadName'],
      include: [{ model: db.piece, attributes: ['id', 'title'] }],
    }),
  ]);

  const coverMap = new Map();
  collections.forEach(c => {
    if (c.coverImage) coverMap.set(c.coverImage, { id: c.id, title: c.title });
  });

  const imageMap = new Map();
  pieces.forEach(p => {
    if (p.imageIdentifier) imageMap.set(p.imageIdentifier, { id: p.id, title: p.title });
  });

  const fileMap = new Map();
  links.forEach(l => {
    const file = path.basename(l.url || '');
    if (file) fileMap.set(file, { id: l.piece?.id, title: l.piece?.title, downloadName: l.downloadName });
  });

  const usage = {
    covers: sumSize(coverEntries),
    images: sumSize(imageEntries),
    files: sumSize(fileEntries),
  };

  return {
    covers: coverEntries.map(entry => ({
      filename: entry.filename,
      sizeBytes: entry.sizeBytes,
      collectionId: coverMap.get(entry.filename)?.id || null,
      collectionTitle: coverMap.get(entry.filename)?.title || null,
    })),
    images: imageEntries.map(entry => ({
      filename: entry.filename,
      sizeBytes: entry.sizeBytes,
      pieceId: imageMap.get(entry.filename)?.id || null,
      pieceTitle: imageMap.get(entry.filename)?.title || null,
    })),
    files: fileEntries.map(entry => ({
      filename: entry.filename,
      sizeBytes: entry.sizeBytes,
      pieceId: fileMap.get(entry.filename)?.id || null,
      pieceTitle: fileMap.get(entry.filename)?.title || null,
      downloadName: fileMap.get(entry.filename)?.downloadName || null,
    })),
    usage: {
      ...usage,
      total: usage.covers + usage.images + usage.files,
    },
  };
}

async function deleteFile(category, filename) {
  const sub = DIRS[category];
  if (!sub) return { notFound: true };
  const safe = path.basename(filename);
  const filePath = path.join(BASE_DIR, sub, safe);

  let inUse = false;
  if (category === 'covers') {
    const count = await db.collection.count({ where: { coverImage: safe } });
    inUse = count > 0;
  } else if (category === 'images') {
    const count = await db.piece.count({ where: { imageIdentifier: safe } });
    inUse = count > 0;
  } else if (category === 'files') {
    const url = `/uploads/${DIRS.files}/${safe}`;
    const count = await db.piece_link.count({ where: { type: 'FILE_DOWNLOAD', url } });
    inUse = count > 0;
  }

  if (inUse) return { inUse: true };

  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (err) {
    if (err.code === 'ENOENT') return { notFound: true };
    throw err;
  }
}

module.exports = { listFiles, deleteFile };
