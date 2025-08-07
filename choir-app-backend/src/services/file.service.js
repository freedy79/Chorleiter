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
    return await fs.readdir(path.join(BASE_DIR, sub));
  } catch {
    return [];
  }
}

async function listFiles() {
  const [coverNames, imageNames, fileNames, collections, pieces, links] = await Promise.all([
    safeReaddir(DIRS.covers),
    safeReaddir(DIRS.images),
    safeReaddir(DIRS.files),
    db.collection.findAll({ attributes: ['id', 'title', 'coverImage'], where: { coverImage: { [Op.not]: null } } }),
    db.piece.findAll({ attributes: ['id', 'title', 'imageIdentifier'], where: { imageIdentifier: { [Op.not]: null } } }),
    db.piece_link.findAll({
      where: { type: 'FILE_DOWNLOAD' },
      attributes: ['url', 'pieceId'],
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
    if (file) fileMap.set(file, { id: l.piece?.id, title: l.piece?.title });
  });

  return {
    covers: coverNames.map(name => ({
      filename: name,
      collectionId: coverMap.get(name)?.id || null,
      collectionTitle: coverMap.get(name)?.title || null,
    })),
    images: imageNames.map(name => ({
      filename: name,
      pieceId: imageMap.get(name)?.id || null,
      pieceTitle: imageMap.get(name)?.title || null,
    })),
    files: fileNames.map(name => ({
      filename: name,
      pieceId: fileMap.get(name)?.id || null,
      pieceTitle: fileMap.get(name)?.title || null,
    })),
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
