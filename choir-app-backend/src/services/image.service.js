const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const logger = require('../config/logger');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const COVER_DIR = path.join(UPLOADS_DIR, 'collection-covers');

/**
 * Resize an image to a specific width while maintaining aspect ratio
 * @param {string} imagePath - Full path to the image file
 * @param {number} targetWidth - Target width in pixels
 * @returns {Promise<Buffer>} Resized image buffer
 */
async function resizeImage(imagePath, targetWidth = 150) {
  try {
    const buffer = await fs.readFile(imagePath);
    const resized = await sharp(buffer)
      .resize(targetWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .toBuffer();
    return resized;
  } catch (err) {
    logger.error(`Error resizing image ${imagePath}:`, err);
    throw new Error(`Failed to resize image: ${err.message}`);
  }
}

/**
 * Get a resized image with specified width
 * Returns the resized image as a buffer with proper metadata for response
 * @param {string} filename - Filename of the cover image
 * @param {number} width - Target width (default: 150)
 * @returns {Promise<{buffer: Buffer, mimeType: string}>}
 */
async function getResizedCover(filename, width = 150) {
  const filePath = path.join(COVER_DIR, path.basename(filename));

  try {
    await fs.access(filePath);
  } catch (err) {
    throw new Error('Cover image not found');
  }

  const resizedBuffer = await resizeImage(filePath, width);
  const ext = path.extname(filename).slice(1).toLowerCase();
  const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext === 'jpe' ? 'jpeg' : ext}`;

  return { buffer: resizedBuffer, mimeType };
}

/**
 * Save a resized copy of a cover image
 * Useful for storing pre-resized versions for common widths
 * @param {string} filename - Original filename
 * @param {number} width - Target width
 * @returns {Promise<string>} New filename with width suffix
 */
async function saveResizedCover(filename, width = 150) {
  const original = path.join(COVER_DIR, path.basename(filename));
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const resizedFilename = `${base}-w${width}${ext}`;
  const resizedPath = path.join(COVER_DIR, resizedFilename);

  try {
    const resizedBuffer = await resizeImage(original, width);
    await fs.writeFile(resizedPath, resizedBuffer);
    logger.info(`Saved resized cover: ${resizedFilename}`);
    return resizedFilename;
  } catch (err) {
    logger.error(`Error saving resized cover:`, err);
    throw err;
  }
}

/**
 * Resize image on upload (modifies the uploaded file in place)
 * @param {string} uploadedFilePath - Path to the uploaded file
 * @param {number} maxWidth - Maximum width (default: 150)
 * @returns {Promise<void>}
 */
async function resizeUploadedCover(uploadedFilePath, maxWidth = 150) {
  try {
    const buffer = await fs.readFile(uploadedFilePath);
    const metadata = await sharp(buffer).metadata();

    // Only resize if the image is larger than maxWidth
    if (metadata.width && metadata.width > maxWidth) {
      const resized = await sharp(buffer)
        .resize(maxWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .toBuffer();

      await fs.writeFile(uploadedFilePath, resized);
      logger.info(`Cover image resized to max width ${maxWidth}px`);
    } else {
      logger.debug(`Cover image is smaller than ${maxWidth}px, no resize needed`);
    }
  } catch (err) {
    logger.error(`Error resizing uploaded cover:`, err);
    throw new Error(`Failed to process cover image: ${err.message}`);
  }
}

/**
 * Batch resize operation - resize all collection covers to common widths
 * @returns {Promise<{processed: number, errors: number}>}
 */
async function resizeAllCovers() {
  let processed = 0;
  let errors = 0;
  const widths = [150, 300, 600]; // Common widths for different screen sizes

  try {
    const files = await fs.readdir(COVER_DIR);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f) && !f.includes('-w'));

    for (const file of imageFiles) {
      for (const width of widths) {
        try {
          await saveResizedCover(file, width);
          processed++;
        } catch (err) {
          logger.error(`Failed to create ${width}px version of ${file}:`, err.message);
          errors++;
        }
      }
    }
  } catch (err) {
    logger.error('Error in batch resize:', err);
  }

  return { processed, errors };
}

/**
 * Clean up resized versions of a cover when the original is deleted
 * @param {string} filename - Original filename
 * @returns {Promise<void>}
 */
async function cleanupResizedVersions(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const widths = [150, 300, 600];

  for (const width of widths) {
    const resizedName = `${base}-w${width}${ext}`;
    const resizedPath = path.join(COVER_DIR, resizedName);
    try {
      await fs.unlink(resizedPath);
      logger.debug(`Deleted resized version: ${resizedName}`);
    } catch (err) {
      // File doesn't exist, that's fine
      if (err.code !== 'ENOENT') {
        logger.warn(`Could not delete resized version ${resizedName}:`, err.message);
      }
    }
  }
}

module.exports = {
  resizeImage,
  getResizedCover,
  saveResizedCover,
  resizeUploadedCover,
  resizeAllCovers,
  cleanupResizedVersions
};
